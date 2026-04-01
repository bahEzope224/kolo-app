import random
import string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.tontine import Tontine
from ..models.payment import TontineMember, Cycle, Payment
from ..models.user import User
from ..schemas.tontine import TontineCreate, TontineOut

from typing import Optional
from pydantic import BaseModel
from ..deps import get_current_user

router = APIRouter(prefix="/tontines", tags=["Tontines"])


def generate_invite_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=6))


@router.post("/", response_model=TontineOut, summary="Créer une tontine")
def create_tontine(body: TontineCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Vérifie que le gérant existe
    manager_id = str(current_user.id)
    # Vérifie que le gérant existe
    manager = db.query(User).filter(User.id == manager_id).first()
    if not manager:
        raise HTTPException(404, "Gérant introuvable")

    # Génère un code d'invitation unique
    code = generate_invite_code()
    while db.query(Tontine).filter(Tontine.invite_code == code).first():
        code = generate_invite_code()

    tontine = Tontine(
        **body.model_dump(),
        invite_code=code,
        manager_id=manager_id,
    )
    db.add(tontine)
    db.flush()

    # Ajoute le gérant comme premier membre
    member = TontineMember(tontine_id=tontine.id, user_id=manager.id, order_index=1)
    db.add(member)

    # Crée le premier cycle
    cycle = Cycle(tontine_id=tontine.id, cycle_number=1)
    db.add(cycle)

    db.commit()
    db.refresh(tontine)
    return tontine

@router.get("/my-tontines", summary="Tontines où l'utilisateur est membre")
def get_my_tontines(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = current_user.id
    memberships = db.query(TontineMember).filter(
        TontineMember.user_id == user_id
    ).all()

    result = []
    for m in memberships:
        t = m.tontine
        # Statut de paiement du membre pour le cycle actuel
        cycle = db.query(Cycle).filter(
            Cycle.tontine_id == t.id,
            Cycle.cycle_number == t.current_cycle,
        ).first()

        payment_status = "missing"
        if cycle:
            payment = db.query(Payment).filter(
                Payment.cycle_id == cycle.id,
                Payment.member_id == user_id,
            ).first()
            if payment:
                payment_status = "paid" if payment.is_validated else "pending"

        result.append({
            "id": str(t.id),
            "name": t.name,
            "contribution_amount": float(t.contribution_amount),
            "start_date": t.start_date.isoformat(),
            "mode": t.mode,
            "invite_code": t.invite_code,
            "current_cycle": t.current_cycle,
            "member_count": len(t.members),
            "is_manager": t.manager_id == user_id,
            "my_payment_status": payment_status,
            "manager_name": t.manager.name,
        })

    return result



@router.get("/{tontine_id}", response_model=TontineOut, summary="Détail d'une tontine")
def get_tontine(tontine_id: str, db: Session = Depends(get_db)):
    tontine = db.query(Tontine).filter(Tontine.id == tontine_id).first()
    if not tontine:
        raise HTTPException(404, "Tontine introuvable")
    return tontine


@router.get("/join/{code}", summary="Info tontine par code d'invitation")
def get_tontine_by_code(code: str, db: Session = Depends(get_db)):
    tontine = db.query(Tontine).filter(
        Tontine.invite_code == code.upper()
    ).first()
    if not tontine:
        raise HTTPException(404, "Code invalide")
    return {
        "id": str(tontine.id),
        "name": tontine.name,
        "contribution_amount": float(tontine.contribution_amount),
        "member_count": len(tontine.members),
        "manager_name": tontine.manager.name,
    }

@router.get("/{tontine_id}/dashboard", summary="Dashboard complet d'une tontine")
def get_tontine_dashboard(tontine_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tontine = db.query(Tontine).filter(Tontine.id == tontine_id).first()
    if not tontine:
        raise HTTPException(404, "Tontine introuvable")

    # Cycle actuel
    cycle = (
        db.query(Cycle)
        .filter(Cycle.tontine_id == tontine_id, Cycle.cycle_number == tontine.current_cycle)
        .first()
    )

    # Membres avec statut de paiement du cycle actuel
    members_data = []
    for m in tontine.members:
        payment = None
        if cycle:
            payment = (
                db.query(Payment)
                .filter(Payment.cycle_id == cycle.id, Payment.member_id == m.user_id)
                .first()
            )
        members_data.append({
            "id": str(m.id),
            "user_id": str(m.user_id),
            "name": m.user.name,
            "phone": m.user.phone,
            "payment_id": str(payment.id) if payment else None,
            "status": "paid" if (payment and payment.is_validated) else
                      "pending" if payment else "missing",
            "validated_at": payment.validated_at.isoformat() if (payment and payment.validated_at) else None,
        })

    paid_count = sum(1 for m in members_data if m["status"] == "paid")
    total_amount = float(tontine.contribution_amount) * len(tontine.members)

    # Contrôle de visibilité (Bénéficiaire et Historique)
    is_manager = str(tontine.manager_id) == str(current_user.id)
    show_details = tontine.show_next_beneficiary or is_manager

    # Bénéficiaire actuel
    beneficiary = None
    if show_details and cycle and cycle.beneficiary_id:
        b = db.query(User).filter(User.id == cycle.beneficiary_id).first()
        if b:
            beneficiary = {"name": b.name, "phone": b.phone}

    # Historique des cycles passés
    history = []
    if show_details:
        past_cycles = (
            db.query(Cycle)
            .filter(Cycle.tontine_id == tontine_id, Cycle.completed_at.isnot(None))
            .order_by(Cycle.cycle_number)
            .all()
        )
        for c in past_cycles:
            if c.beneficiary_id:
                b = db.query(User).filter(User.id == c.beneficiary_id).first()
                history.append({
                    "cycle_number": c.cycle_number,
                    "beneficiary_name": b.name if b else "—",
                    "total_amount": float(c.total_amount) if c.total_amount else 0,
                    "completed_at": c.completed_at.isoformat(),
                })

    return {
        "id": str(tontine.id),
        "name": tontine.name,
        "contribution_amount": float(tontine.contribution_amount),
        "start_date": tontine.start_date.isoformat(),
        "mode": tontine.mode,
        "invite_code": tontine.invite_code,
        "current_cycle": tontine.current_cycle,
        "manager_id": str(tontine.manager_id),
        "is_manager": tontine.manager_id == current_user.id,
        "total_amount": total_amount,
        "paid_count": paid_count,
        "member_count": len(tontine.members),
        "beneficiary": beneficiary,
        "members": members_data,
        "history": history,
        "cycle_id": str(cycle.id) if cycle else None,
        "welcome_message":        tontine.welcome_message,
        "payment_day":            tontine.payment_day,
        "show_next_beneficiary":  tontine.show_next_beneficiary,
        "show_payments": tontine.show_payments,
        "mode": tontine.mode,
    }




class TontineSettings(BaseModel):
    name: Optional[str] = None
    contribution_amount: Optional[float] = None
    welcome_message: Optional[str] = None
    show_next_beneficiary: Optional[bool] = None
    payment_day: Optional[int] = None  # jour du mois (1-28)
    show_payments: Optional[bool] = None
    mode: Optional[str] = None




@router.put("/{tontine_id}/settings", summary="Paramètres de la tontine")
def update_tontine_settings(tontine_id: str, body: TontineSettings, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tontine = db.query(Tontine).filter(Tontine.id == tontine_id).first()
    if not tontine:
        raise HTTPException(404, "Tontine introuvable")
    
    # Autorisation gérant
    if tontine.manager_id != current_user.id:
        raise HTTPException(403, "Seul le gérant peut modifier les paramètres")

    if body.name is not None:
        tontine.name = body.name
    if body.contribution_amount is not None:
        tontine.contribution_amount = body.contribution_amount
    if body.welcome_message is not None:
        tontine.welcome_message = body.welcome_message
    if body.show_next_beneficiary is not None:
        tontine.show_next_beneficiary = body.show_next_beneficiary
    if body.payment_day is not None:
        if not 1 <= body.payment_day <= 28:
            raise HTTPException(400, "Le jour doit être entre 1 et 28")
        tontine.payment_day = body.payment_day
        
    if body.mode is not None:
        if body.mode not in ["random", "fixed", "manual"]:
            raise HTTPException(400, "Mode invalide")
        tontine.mode = body.mode
    if body.show_payments is not None:
        tontine.show_payments = body.show_payments
    
    db.commit()
    return {"message": "Paramètres mis à jour"}


@router.delete("/{tontine_id}", summary="Supprimer une tontine")
def delete_tontine(tontine_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tontine = db.query(Tontine).filter(Tontine.id == tontine_id).first()
    if not tontine:
        raise HTTPException(404, "Tontine introuvable")

    # Autorisation gérant
    if tontine.manager_id != current_user.id:
        raise HTTPException(403, "Seul le gérant peut supprimer la tontine")

    db.delete(tontine)
    db.commit()
    return {"message": "Tontine supprimée avec succès"}