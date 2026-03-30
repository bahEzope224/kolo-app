from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models.transfer import TransferRequest, TransferStatus
from ..models.tontine import Tontine
from ..models.payment import TontineMember
from ..models.user import User
from ..models.notification import Notification, NotifType

router = APIRouter(prefix="/transfer", tags=["Transfert"])


class TransferCreate(BaseModel):
    tontine_id: str
    to_user_id: str
    from_user_id: str


@router.post("/request", summary="Demander un transfert de gérance")
def request_transfer(body: TransferCreate, db: Session = Depends(get_db)):
    tontine = db.query(Tontine).filter(Tontine.id == body.tontine_id).first()
    if not tontine:
        raise HTTPException(404, "Tontine introuvable")

    # Vérifie que le demandeur est bien le gérant
    if str(tontine.manager_id) != body.from_user_id:
        raise HTTPException(403, "Seul le gérant peut transférer la gestion")

    # Vérifie que le destinataire est membre
    member = db.query(TontineMember).filter(
        TontineMember.tontine_id == body.tontine_id,
        TontineMember.user_id == body.to_user_id,
    ).first()
    if not member:
        raise HTTPException(400, "Ce membre n'est pas dans la tontine")

    # Annule les demandes précédentes en attente
    db.query(TransferRequest).filter(
        TransferRequest.tontine_id == body.tontine_id,
        TransferRequest.status == TransferStatus.pending,
    ).update({"status": TransferStatus.refused})

    # Crée la demande
    transfer = TransferRequest(
        tontine_id=body.tontine_id,
        from_user_id=body.from_user_id,
        to_user_id=body.to_user_id,
    )
    db.add(transfer)
    db.flush()

    # Notifie le membre choisi
    to_user = db.query(User).filter(User.id == body.to_user_id).first()
    from_user = db.query(User).filter(User.id == body.from_user_id).first()

    notif = Notification(
        user_id=body.to_user_id,
        type=NotifType.new_member,  # on réutilise un type existant
        title="Demande de transfert de gérance 👑",
        body=f"{from_user.name} te propose de devenir gérant(e) de la tontine '{tontine.name}'. Acceptes-tu ?",
    )
    db.add(notif)
    db.commit()

    return {
        "message": f"Demande envoyée à {to_user.name}",
        "transfer_id": str(transfer.id),
    }


@router.post("/{transfer_id}/respond", summary="Accepter ou refuser le transfert")
def respond_transfer(transfer_id: str, accept: bool, db: Session = Depends(get_db)):
    transfer = db.query(TransferRequest).filter(
        TransferRequest.id == transfer_id,
        TransferRequest.status == TransferStatus.pending,
    ).first()
    if not transfer:
        raise HTTPException(404, "Demande introuvable ou déjà traitée")

    transfer.responded_at = datetime.utcnow()

    if accept:
        transfer.status = TransferStatus.accepted

        # Transfère la gérance
        tontine = db.query(Tontine).filter(Tontine.id == transfer.tontine_id).first()
        old_manager_id = tontine.manager_id
        tontine.manager_id = transfer.to_user_id

        # Notifie l'ancien gérant
        notif_old = Notification(
            user_id=str(old_manager_id),
            type=NotifType.new_member,
            title="Transfert accepté ✓",
            body=f"{transfer.to_user.name} a accepté la gérance de '{tontine.name}'.",
        )
        # Notifie le nouveau gérant
        notif_new = Notification(
            user_id=str(transfer.to_user_id),
            type=NotifType.new_member,
            title="Tu es maintenant gérant(e) 👑",
            body=f"Tu gères maintenant la tontine '{tontine.name}'. Bienvenue !",
        )
        db.add(notif_old)
        db.add(notif_new)
        db.commit()

        return {"message": "Transfert accepté — tu es maintenant gérant(e) !"}
    else:
        transfer.status = TransferStatus.refused

        # Notifie l'ancien gérant du refus
        notif = Notification(
            user_id=str(transfer.from_user_id),
            type=NotifType.new_member,
            title="Transfert refusé",
            body=f"{transfer.to_user.name} a refusé la gérance de '{transfer.tontine.name}'.",
        )
        db.add(notif)
        db.commit()

        return {"message": "Transfert refusé"}


@router.get("/tontine/{tontine_id}/pending", summary="Demande de transfert en attente")
def get_pending_transfer(tontine_id: str, db: Session = Depends(get_db)):
    transfer = db.query(TransferRequest).filter(
        TransferRequest.tontine_id == tontine_id,
        TransferRequest.status == TransferStatus.pending,
    ).first()
    if not transfer:
        return None
    return {
        "id": str(transfer.id),
        "to_user_id": str(transfer.to_user_id),
        "to_user_name": transfer.to_user.name,
        "from_user_name": transfer.from_user.name,
    }


@router.get("/user/{user_id}/pending", summary="Demandes de transfert reçues par un user")
def get_user_pending_transfers(user_id: str, db: Session = Depends(get_db)):
    transfers = db.query(TransferRequest).filter(
        TransferRequest.to_user_id == user_id,
        TransferRequest.status == TransferStatus.pending,
    ).all()
    return [
        {
            "id": str(t.id),
            "tontine_id": str(t.tontine_id),
            "tontine_name": t.tontine.name,
            "from_user_name": t.from_user.name,
        }
        for t in transfers
    ]