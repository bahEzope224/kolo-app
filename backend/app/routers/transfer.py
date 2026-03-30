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
    tontine_id:   str
    from_user_id: str
    to_user_id:   str


def get_user(db, user_id):
    return db.query(User).filter(User.id == user_id).first()

def get_tontine(db, tontine_id):
    return db.query(Tontine).filter(Tontine.id == tontine_id).first()


@router.post("/request", summary="Demander un transfert de gérance")
def request_transfer(body: TransferCreate, db: Session = Depends(get_db)):
    tontine  = get_tontine(db, body.tontine_id)
    if not tontine:
        raise HTTPException(404, "Tontine introuvable")
    if str(tontine.manager_id) != body.from_user_id:
        raise HTTPException(403, "Seul le gérant peut transférer la gestion")

    member = db.query(TontineMember).filter(
        TontineMember.tontine_id == body.tontine_id,
        TontineMember.user_id    == body.to_user_id,
    ).first()
    if not member:
        raise HTTPException(400, "Ce membre n'est pas dans la tontine")

    # Annule les demandes précédentes
    db.query(TransferRequest).filter(
        TransferRequest.tontine_id == body.tontine_id,
        TransferRequest.status     == TransferStatus.pending,
    ).update({"status": TransferStatus.refused})

    transfer = TransferRequest(
        tontine_id=body.tontine_id,
        from_user_id=body.from_user_id,
        to_user_id=body.to_user_id,
    )
    db.add(transfer)
    db.flush()

    from_user = get_user(db, body.from_user_id)
    to_user   = get_user(db, body.to_user_id)

    notif = Notification(
        user_id=body.to_user_id,
        type=NotifType.new_member,
        title="Demande de transfert de gérance 👑",
        body=f"{from_user.name} te propose de devenir gérant(e) de '{tontine.name}'. Acceptes-tu ?",
    )
    db.add(notif)
    db.commit()

    return {"message": f"Demande envoyée à {to_user.name}", "transfer_id": str(transfer.id)}


@router.post("/{transfer_id}/respond", summary="Accepter ou refuser le transfert")
def respond_transfer(transfer_id: str, accept: bool, db: Session = Depends(get_db)):
    transfer = db.query(TransferRequest).filter(
        TransferRequest.id     == transfer_id,
        TransferRequest.status == TransferStatus.pending,
    ).first()
    if not transfer:
        raise HTTPException(404, "Demande introuvable ou déjà traitée")

    transfer.responded_at = datetime.utcnow()
    tontine   = get_tontine(db, str(transfer.tontine_id))
    to_user   = get_user(db, str(transfer.to_user_id))
    from_user = get_user(db, str(transfer.from_user_id))

    if accept:
        transfer.status    = TransferStatus.accepted
        tontine.manager_id = transfer.to_user_id

        db.add(Notification(
            user_id=str(transfer.from_user_id),
            type=NotifType.new_member,
            title="Transfert accepté ✓",
            body=f"{to_user.name} a accepté la gérance de '{tontine.name}'.",
        ))
        db.add(Notification(
            user_id=str(transfer.to_user_id),
            type=NotifType.new_member,
            title="Tu es maintenant gérant(e) 👑",
            body=f"Tu gères maintenant la tontine '{tontine.name}'.",
        ))
        db.commit()
        return {"message": "Transfert accepté — tu es maintenant gérant(e) !"}
    else:
        transfer.status = TransferStatus.refused
        db.add(Notification(
            user_id=str(transfer.from_user_id),
            type=NotifType.new_member,
            title="Transfert refusé",
            body=f"{to_user.name} a refusé la gérance de '{tontine.name}'.",
        ))
        db.commit()
        return {"message": "Transfert refusé"}


@router.get("/user/{user_id}/pending", summary="Demandes reçues en attente")
def get_user_pending_transfers(user_id: str, db: Session = Depends(get_db)):
    transfers = db.query(TransferRequest).filter(
        TransferRequest.to_user_id == user_id,
        TransferRequest.status     == TransferStatus.pending,
    ).all()

    result = []
    for t in transfers:
        tontine   = get_tontine(db, str(t.tontine_id))
        from_user = get_user(db, str(t.from_user_id))
        result.append({
            "id":             str(t.id),
            "tontine_id":     str(t.tontine_id),
            "tontine_name":   tontine.name if tontine else "—",
            "from_user_name": from_user.name if from_user else "—",
        })
    return result


@router.get("/tontine/{tontine_id}/pending", summary="Demande en attente pour une tontine")
def get_tontine_pending_transfer(tontine_id: str, db: Session = Depends(get_db)):
    transfer = db.query(TransferRequest).filter(
        TransferRequest.tontine_id == tontine_id,
        TransferRequest.status     == TransferStatus.pending,
    ).first()
    if not transfer:
        return None
    to_user   = get_user(db, str(transfer.to_user_id))
    from_user = get_user(db, str(transfer.from_user_id))
    return {
        "id":             str(transfer.id),
        "to_user_id":     str(transfer.to_user_id),
        "to_user_name":   to_user.name if to_user else "—",
        "from_user_name": from_user.name if from_user else "—",
    }