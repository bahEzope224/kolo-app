from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models.user import User
from ..models.payment import TontineMember, Payment, Cycle
from ..models.tontine import Tontine

router = APIRouter(prefix="/users", tags=["Utilisateurs"])


class UserUpdate(BaseModel):
    name: str
    phone: str


class UserCreate(BaseModel):
    name: str
    phone: str


@router.post("/", summary="Créer un compte")
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.phone == body.phone).first()
    if existing:
        raise HTTPException(400, "Ce numéro est déjà enregistré")
    user = User(name=body.name, phone=body.phone)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Compte créé", "user_id": str(user.id), "name": user.name}


@router.get("/{user_id}", summary="Profil utilisateur")
def get_profile(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    return {"id": str(user.id), "name": user.name, "phone": user.phone, "created_at": user.created_at.isoformat()}


@router.put("/{user_id}", summary="Mettre à jour le profil")
def update_profile(user_id: str, body: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")

    # Vérifie que le nouveau numéro n'est pas pris
    if body.phone != user.phone:
        existing = db.query(User).filter(User.phone == body.phone).first()
        if existing:
            raise HTTPException(400, "Ce numéro est déjà utilisé par un autre compte")

    user.name = body.name.strip()
    user.phone = body.phone.strip()
    db.commit()
    db.refresh(user)

    # Met à jour le localStorage côté client via la réponse
    return {"message": "Profil mis à jour", "name": user.name, "phone": user.phone}


@router.get("/{user_id}/summary", summary="Résumé financier")
def get_financial_summary(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")

    # Total versé (tous les paiements validés)
    payments = db.query(Payment).filter(
        Payment.member_id == user_id,
        Payment.is_validated == True,
    ).all()
    total_paid = sum(float(p.amount) for p in payments)

    # Total reçu (cycles où l'utilisateur était bénéficiaire)
    received_cycles = db.query(Cycle).filter(
        Cycle.beneficiary_id == user_id,
        Cycle.completed_at.isnot(None),
    ).all()
    total_received = sum(float(c.total_amount) for c in received_cycles if c.total_amount)

    # Nombre de tontines actives
    active_memberships = db.query(TontineMember).filter(
        TontineMember.user_id == user_id
    ).count()

    # Détail par tontine
    memberships = db.query(TontineMember).filter(TontineMember.user_id == user_id).all()
    tontines_detail = []
    for m in memberships:
        t = m.tontine
        paid_in_tontine = sum(
            float(p.amount) for p in payments
            if any(str(p.cycle_id) == str(c.id) for c in t.cycles)
        )
        received_in_tontine = sum(
            float(c.total_amount) for c in t.cycles
            if str(c.beneficiary_id) == user_id and c.total_amount and c.completed_at
        )
        tontines_detail.append({
            "tontine_id": str(t.id),
            "tontine_name": t.name,
            "is_manager": str(t.manager_id) == user_id,
            "total_paid": paid_in_tontine,
            "total_received": received_in_tontine,
            "cycles_count": t.current_cycle - 1,
        })

    return {
        "total_paid": total_paid,
        "total_received": total_received,
        "balance": total_received - total_paid,
        "active_tontines": active_memberships,
        "tontines": tontines_detail,
    }