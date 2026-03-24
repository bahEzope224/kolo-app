from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.tontine import Tontine
from ..models.payment import Payment, TontineMember

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", summary="Statistiques générales")
def get_admin_stats(db: Session = Depends(get_db)):
    total_users    = db.query(User).count()
    total_tontines = db.query(Tontine).count()
    total_members  = db.query(TontineMember).count()
    total_payments = db.query(Payment).filter(
        Payment.is_validated == True
    ).count()
    total_amount = db.query(Payment).filter(
        Payment.is_validated == True
    ).with_entities(func.sum(Payment.amount)).scalar() or 0

    return {
        "total_users":    total_users,
        "total_tontines": total_tontines,
        "total_members":  total_members,
        "total_payments": total_payments,
        "total_amount":   float(total_amount),
    }