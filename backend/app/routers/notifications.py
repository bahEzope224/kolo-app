from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.notification import Notification
from ..models.user import User
from ..deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/me", summary="Notifications de l'utilisateur connecté")
def get_my_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = str(current_user.id)
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


@router.post("/me/read-all", summary="Marquer toutes comme lues")
def mark_my_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = str(current_user.id)
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "Toutes les notifications marquées comme lues"}


@router.post("/{notif_id}/read", summary="Marquer une notification comme lue")
def mark_read(notif_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "ok"}