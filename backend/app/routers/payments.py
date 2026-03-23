import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.payment import Cycle, Payment, TontineMember
from ..models.tontine import Tontine
from ..models.user import User

from ..services.notifications import (
    notify_payment_validated,
    notify_beneficiary_all,
    notify_late_members,
)
router = APIRouter(prefix="/payments", tags=["Versements"])


@router.get("/cycle/{cycle_id}", summary="Versements d'un cycle")
def get_cycle_payments(cycle_id: str, db: Session = Depends(get_db)):
    payments = db.query(Payment).filter(Payment.cycle_id == cycle_id).all()
    return [
        {
            "id": str(p.id),
            "member_name": p.member.name,
            "member_phone": p.member.phone,
            "amount": float(p.amount),
            "is_validated": p.is_validated,
            "validated_at": p.validated_at.isoformat() if p.validated_at else None,
        }
        for p in payments
    ]


@router.post("/{payment_id}/validate", summary="Valider un versement")
async def validate_payment(payment_id: str, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(404, "Versement introuvable")
    if payment.is_validated:
        raise HTTPException(400, "Déjà validé")

    payment.is_validated = True
    payment.validated_at = datetime.utcnow()
    db.commit()
    # Notifie le membre
    notify_payment_validated(db, str(payment.member_id), payment.member.name, float(payment.amount))
    db.commit()
    return {"message": "Versement validé", "payment_id": str(payment.id)}


@router.post("/tontine/{tontine_id}/draw", summary="Tirage au sort équitable")
def draw_beneficiary(tontine_id: str, db: Session = Depends(get_db)):
    tontine = db.query(Tontine).filter(Tontine.id == tontine_id).first()
    if not tontine:
        raise HTTPException(404, "Tontine introuvable")

    members = db.query(TontineMember).filter(
        TontineMember.tontine_id == tontine_id
    ).all()
    if not members:
        raise HTTPException(400, "Aucun membre dans la tontine")

    # Cycles COMPLÉTÉS uniquement (pas le cycle en cours)
    completed_cycles = db.query(Cycle).filter(
        Cycle.tontine_id == tontine_id,
        Cycle.completed_at.isnot(None),
        Cycle.beneficiary_id.isnot(None),
    ).all()

    # IDs des membres ayant déjà reçu dans ce "tour complet"
    all_member_ids = {str(m.user_id) for m in members}
    already_received = {str(c.beneficiary_id) for c in completed_cycles}

    # Membres éligibles = ceux qui N'ont PAS encore reçu
    eligible_ids = all_member_ids - already_received
    eligible = [m for m in members if str(m.user_id) in eligible_ids]

    # Si tout le monde a reçu → on repart de zéro (nouveau tour)
    if not eligible:
        eligible = members
        already_received = set()

    # Cycle actuel — vérifie qu'il n'a pas déjà un bénéficiaire
    cycle = db.query(Cycle).filter(
        Cycle.tontine_id == tontine_id,
        Cycle.cycle_number == tontine.current_cycle,
    ).first()
    if not cycle:
        raise HTTPException(400, "Cycle actuel introuvable")
    if cycle.beneficiary_id:
        raise HTTPException(400, "Un bénéficiaire a déjà été désigné pour ce cycle")

    winner = random.choice(eligible)
    total = float(tontine.contribution_amount) * len(members)

    cycle.beneficiary_id = winner.user_id
    cycle.total_amount = total

    # Notifie tous les membres
    from ..services.notifications import notify_beneficiary_all
    all_ids = [str(m.user_id) for m in members]
    notify_beneficiary_all(db, all_ids, winner.user.name, total, tontine.current_cycle)

    db.commit()

    # Infos sur les membres restants éligibles après ce tirage
    remaining_eligible = len(eligible) - 1
    new_tour = len(eligible) == len(members)  # True si on recommence un nouveau tour

    return {
        "beneficiary_id": str(winner.user_id),
        "beneficiary_name": winner.user.name,
        "beneficiary_phone": winner.user.phone,
        "total_amount": total,
        "cycle_number": tontine.current_cycle,
        "remaining_eligible": remaining_eligible,
        "new_tour": new_tour,
        "message": (
            f"Nouveau tour ! {winner.user.name} ouvre le cycle."
            if new_tour else
            f"{remaining_eligible} membre(s) n'ont pas encore reçu."
        ),
    }

@router.post("/tontine/{tontine_id}/close-cycle", summary="Clôturer le cycle actuel")
def close_cycle(tontine_id: str, db: Session = Depends(get_db)):
    tontine = db.query(Tontine).filter(Tontine.id == tontine_id).first()
    if not tontine:
        raise HTTPException(404, "Tontine introuvable")

    # Clôture le cycle actuel
    cycle = db.query(Cycle).filter(
        Cycle.tontine_id == tontine_id,
        Cycle.cycle_number == tontine.current_cycle,
    ).first()
    if not cycle:
        raise HTTPException(400, "Cycle introuvable")
    if not cycle.beneficiary_id:
        raise HTTPException(400, "Désigne un bénéficiaire avant de clôturer")

    cycle.completed_at = datetime.utcnow()

    # Crée le cycle suivant
    tontine.current_cycle += 1
    new_cycle = Cycle(
        tontine_id=tontine_id,
        cycle_number=tontine.current_cycle,
    )
    db.add(new_cycle)
    db.flush()

    # Crée les versements en attente pour tous les membres
    for m in tontine.members:
        payment = Payment(
            cycle_id=new_cycle.id,
            member_id=m.user_id,
            amount=tontine.contribution_amount,
        )
        db.add(payment)

    db.commit()
    return {
        "message": f"Cycle {cycle.cycle_number} clôturé",
        "new_cycle": tontine.current_cycle,
    }


@router.post("/tontine/{tontine_id}/add", summary="Ajouter un versement manuellement")
def add_payment(tontine_id: str, member_id: str, amount: float, db: Session = Depends(get_db)):
    tontine = db.query(Tontine).filter(Tontine.id == tontine_id).first()
    if not tontine:
        raise HTTPException(404, "Tontine introuvable")

    # Vérifie que le membre appartient à la tontine
    member = db.query(TontineMember).filter(
        TontineMember.tontine_id == tontine_id,
        TontineMember.user_id == member_id,
    ).first()
    if not member:
        raise HTTPException(404, "Membre introuvable dans cette tontine")

    # Cycle actuel
    cycle = db.query(Cycle).filter(
        Cycle.tontine_id == tontine_id,
        Cycle.cycle_number == tontine.current_cycle,
    ).first()
    if not cycle:
        raise HTTPException(400, "Aucun cycle actif")

    # Vérifie si un versement existe déjà
    existing = db.query(Payment).filter(
        Payment.cycle_id == cycle.id,
        Payment.member_id == member_id,
    ).first()

    if existing:
        # Met à jour le versement existant
        existing.amount = amount
        existing.is_validated = True
        existing.validated_at = datetime.utcnow()
        db.commit()
        return {"message": "Versement mis à jour et validé", "payment_id": str(existing.id)}
    else:
        # Crée un nouveau versement directement validé
        payment = Payment(
            cycle_id=cycle.id,
            member_id=member_id,
            amount=amount,
            is_validated=True,
            validated_at=datetime.utcnow(),
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return {"message": "Versement enregistré et validé", "payment_id": str(payment.id)}
    


@router.post("/tontine/{tontine_id}/remind-late", summary="Envoyer rappel aux membres en retard")
def remind_late_members(tontine_id: str, db: Session = Depends(get_db)):
    tontine = db.query(Tontine).filter(Tontine.id == tontine_id).first()
    if not tontine:
        raise HTTPException(404, "Tontine introuvable")

    # Cycle actuel
    cycle = db.query(Cycle).filter(
        Cycle.tontine_id == tontine_id,
        Cycle.cycle_number == tontine.current_cycle,
    ).first()
    if not cycle:
        raise HTTPException(400, "Aucun cycle actif")

    # Trouve les membres dont le versement n'est pas validé
    all_members = db.query(TontineMember).filter(
        TontineMember.tontine_id == tontine_id
    ).all()

    late_ids = []
    for m in all_members:
        payment = db.query(Payment).filter(
            Payment.cycle_id == cycle.id,
            Payment.member_id == m.user_id,
        ).first()
        if not payment or not payment.is_validated:
            late_ids.append(str(m.user_id))

    if not late_ids:
        return {"message": "Tous les membres ont payé 🎉", "count": 0}

    notify_late_members(db, late_ids, tontine.name)
    db.commit()

    return {
        "message": f"Rappel envoyé à {len(late_ids)} membre(s) en retard",
        "count": len(late_ids),
    }