from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/{user_id}", summary="Notifications d'un utilisateur")
def get_notifications(user_id: str, db: Session = Depends(get_db)):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": str(n.id),
            "type": n.type,
            "title": n.title,
            "body": n.body,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifs
    ]


@router.post("/{user_id}/read-all", summary="Marquer toutes comme lues")
def mark_all_read(user_id: str, db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "Toutes les notifications marquées comme lues"}


@router.post("/{notif_id}/read", summary="Marquer une notification comme lue")
def mark_read(notif_id: str, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "ok"}