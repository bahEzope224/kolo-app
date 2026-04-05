import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.tontine import Tontine
from ..models.payment import Payment, TontineMember, Cycle
from ..deps import get_current_user
from ..services.notifications import notify_tontine_deleted_by_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])


def check_admin(user: User):
    if not user.is_admin:
        raise HTTPException(403, "Accès réservé à l'administrateur")


@router.get("/stats", summary="Statistiques générales")
def get_admin_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_admin(current_user)
    
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


@router.get("/users", summary="Liste des utilisateurs (Admin)")
def get_admin_users(search: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_admin(current_user)
    
    query = db.query(User)
    if search:
        sf = f"%{search}%"
        query = query.filter((User.name.ilike(sf)) | (User.email.ilike(sf)))
    
    users = query.order_by(User.created_at.desc()).limit(50).all()
    return [
        {
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "avatar": u.avatar,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat() if u.created_at else None
        } for u in users
    ]


@router.get("/tontines", summary="Liste de toutes les tontines")
def get_admin_tontines(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    check_admin(current_user)
    
    query = db.query(Tontine)
    if search:
        sf = f"%{search}%"
        query = query.filter(Tontine.name.ilike(sf))
        
    tontines = query.order_by(Tontine.created_at.desc()).all()
    
    result = []
    for t in tontines:
        manager = db.query(User).filter(User.id == t.manager_id).first()
        result.append({
            "id": str(t.id),
            "name": t.name,
            "manager_name": manager.name if manager else "Inconnu",
            "manager_id": str(t.manager_id),
            "members_count": len(t.members),
            "contribution": t.contribution_amount,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "status": "Active" # Simplification
        })
    return result


@router.delete("/tontines/{tontine_id}", summary="Supprimer une tontine (Admin)")
def delete_admin_tontine(
    tontine_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_admin(current_user)
    
    try:
        tontine = db.query(Tontine).filter(Tontine.id == tontine_id).first()
        if not tontine:
            raise HTTPException(404, "Tontine introuvable")
        
        tontine_name = tontine.name
        manager_id = str(tontine.manager_id)
        
        # Notification au gérant
        notify_tontine_deleted_by_admin(db, manager_id, tontine_name)
        
        # Suppression (la cascade s'occupe des membres, cycles, payments selon le modèle)
        db.delete(tontine)
        db.commit()
        
        return {"message": f"Tontine '{tontine_name}' supprimée avec succès."}
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la suppression de la tontine {tontine_id}: {str(e)}")
        raise HTTPException(500, f"Erreur interne lors de la suppression: {str(e)}")