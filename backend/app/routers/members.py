from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.payment import TontineMember, Cycle, Payment
from ..models.tontine import Tontine
from ..models.user import User
from ..schemas.tontine import MemberInvite
from ..services.notifications import notify_new_member

router = APIRouter(prefix="/members", tags=["Membres"])


@router.post("/{tontine_id}/invite", summary="Inviter un membre")
def invite_member(tontine_id: str, body: MemberInvite, db: Session = Depends(get_db)):
    tontine = db.query(Tontine).filter(Tontine.id == tontine_id).first()
    if not tontine:
        raise HTTPException(404, "Tontine introuvable")

    # Crée l'utilisateur s'il n'existe pas
    user = db.query(User).filter(User.phone == body.phone).first()
    if not user:
        user = User(phone=body.phone, name=body.name)
        db.add(user)
        db.flush()

    # Vérifie qu'il n'est pas déjà membre
    existing = db.query(TontineMember).filter(
        TontineMember.tontine_id == tontine_id,
        TontineMember.user_id == user.id,
    ).first()
    if existing:
        raise HTTPException(400, "Ce membre est déjà dans la tontine")

    # Ajoute le membre
    order_index = len(tontine.members) + 1
    member = TontineMember(
        tontine_id=tontine_id,
        user_id=user.id,
        order_index=order_index,
    )
    db.add(member)
    db.flush()

    # Crée un versement "en attente" pour le cycle actuel
    cycle = db.query(Cycle).filter(
        Cycle.tontine_id == tontine_id,
        Cycle.cycle_number == tontine.current_cycle,
    ).first()
    if cycle:
        payment = Payment(
            cycle_id=cycle.id,
            member_id=user.id,
            amount=tontine.contribution_amount,
        )
        db.add(payment)

    db.commit()
    # Notifie le gérant
    notify_new_member(db, str(tontine.manager_id), body.name, tontine.name)
    db.commit()
    return {
        "message": f"{body.name} ajouté(e) avec succès",
        "user_id": str(user.id),
        "invite_link": f"https://kolo.app/join/{tontine.invite_code}",
    }


@router.post("/join/{code}", summary="Rejoindre via code d'invitation")
def join_by_code(code: str, user_id: str, db: Session = Depends(get_db)):
    tontine = db.query(Tontine).filter(
        Tontine.invite_code == code.upper()
    ).first()
    if not tontine:
        raise HTTPException(404, "Code invalide ou expiré")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")

    # Déjà membre ?
    existing = db.query(TontineMember).filter(
        TontineMember.tontine_id == tontine.id,
        TontineMember.user_id == user.id,
    ).first()
    if existing:
        raise HTTPException(400, "Tu es déjà membre de cette tontine")

    order_index = len(tontine.members) + 1
    member = TontineMember(
        tontine_id=tontine.id,
        user_id=user.id,
        order_index=order_index,
    )
    db.add(member)
    db.flush()

    # Versement en attente pour le cycle actuel
    cycle = db.query(Cycle).filter(
        Cycle.tontine_id == tontine.id,
        Cycle.cycle_number == tontine.current_cycle,
    ).first()
    if cycle:
        payment = Payment(
            cycle_id=cycle.id,
            member_id=user.id,
            amount=tontine.contribution_amount,
        )
        db.add(payment)

    db.commit()
    return {
        "message": f"Tu as rejoint {tontine.name} !",
        "tontine_id": str(tontine.id),
        "tontine_name": tontine.name,
    }


@router.delete("/{tontine_id}/{member_id}", summary="Supprimer un membre")
def remove_member(tontine_id: str, member_id: str, db: Session = Depends(get_db)):
    tontine = db.query(Tontine).filter(Tontine.id == tontine_id).first()
    if not tontine:
        raise HTTPException(404, "Tontine introuvable")

    # Empêche de supprimer le gérant
    if str(tontine.manager_id) == member_id:
        raise HTTPException(400, "Impossible de supprimer le gérant")

    member = db.query(TontineMember).filter(
        TontineMember.tontine_id == tontine_id,
        TontineMember.user_id == member_id,
    ).first()
    if not member:
        raise HTTPException(404, "Membre introuvable")

    # Supprime ses versements en attente sur le cycle actuel
    cycle = db.query(Cycle).filter(
        Cycle.tontine_id == tontine_id,
        Cycle.cycle_number == tontine.current_cycle,
    ).first()
    if cycle:
        db.query(Payment).filter(
            Payment.cycle_id == cycle.id,
            Payment.member_id == member_id,
            Payment.is_validated == False,
        ).delete()

    db.delete(member)
    db.commit()
    return {"message": "Membre retiré de la tontine"}


@router.post("/join/{code}", summary="Rejoindre une tontine via code")
def join_by_code(code: str, user_id: str, db: Session = Depends(get_db)):
    tontine = db.query(Tontine).filter(
        Tontine.invite_code == code.upper()
    ).first()
    if not tontine:
        raise HTTPException(404, "Code invalide ou expiré")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")

    existing = db.query(TontineMember).filter(
        TontineMember.tontine_id == tontine.id,
        TontineMember.user_id == user.id,
    ).first()
    if existing:
        raise HTTPException(400, "Tu es déjà membre de cette tontine")

    order_index = len(tontine.members) + 1
    member = TontineMember(tontine_id=tontine.id, user_id=user.id, order_index=order_index)
    db.add(member)
    db.flush()

    cycle = db.query(Cycle).filter(
        Cycle.tontine_id == tontine.id,
        Cycle.cycle_number == tontine.current_cycle,
    ).first()
    if cycle:
        payment = Payment(
            cycle_id=cycle.id,
            member_id=user.id,
            amount=tontine.contribution_amount,
        )
        db.add(payment)

    # Notifie le gérant
    from ..services.notifications import notify_new_member
    notify_new_member(db, str(tontine.manager_id), user.name, tontine.name)

    db.commit()
    return {
        "message": f"Tu as rejoint {tontine.name} !",
        "tontine_id": str(tontine.id),
        "tontine_name": tontine.name,
    }