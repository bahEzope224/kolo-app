from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models.user import User
from ..models.payment import TontineMember, Payment, Cycle
from ..models.tontine import Tontine
from sqlalchemy import func

from ..deps import get_current_user

router = APIRouter(prefix="/users", tags=["Utilisateurs"])


class UserUpdate(BaseModel):
    name: str
    phone: str


class UserCreate(BaseModel):
    name: str
    phone: str


class UserSync(BaseModel):
    name: str
    email: Optional[str] = None


@router.post("/sync", summary="Synchroniser le nom et le rôle avec Clerk")
def sync_user(body: UserSync, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.name or current_user.name == "Utilisateur Kolo":
        current_user.name = body.name.strip()
    
    # Promotion admin & enregistrement email
    if body.email:
        current_user.email = body.email.strip().lower()
        if current_user.email == "contact@ibrahima-bah.com":
            current_user.is_admin = True
    
    db.commit()
    return {"name": current_user.name, "is_admin": current_user.is_admin}


@router.get("/me", summary="Profil utilisateur connecté")
def get_my_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "phone": current_user.phone,
        "avatar": current_user.avatar,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }


# 1. D'ABORD la route admin
@router.get("/admin/stats", summary="Statistiques générales")
def get_admin_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(403, "Accès réservé à l'administrateur")
    from sqlalchemy import func
    from ..models.tontine import Tontine
    from ..models.payment import Payment, TontineMember

    total_users    = db.query(User).count()
    total_tontines = db.query(Tontine).count()
    total_members  = db.query(TontineMember).count()
    total_payments = db.query(Payment).filter(Payment.is_validated == True).count()
    total_amount   = db.query(Payment).filter(
        Payment.is_validated == True
    ).with_entities(func.sum(Payment.amount)).scalar() or 0

    return {
        "total_users":    total_users,
        "total_tontines": total_tontines,
        "total_members":  total_members,
        "total_payments": total_payments,
        "total_amount":   float(total_amount),
    }


@router.get("/admin/users", summary="Liste des utilisateurs (Admin)")
def get_admin_users(search: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(403, "Accès réservé à l'administrateur")
    
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


@router.get("/profile", summary="Profil utilisateur (obsolète, préférer /me)")
def get_profile_old(current_user: User = Depends(get_current_user)):
    return {"id": str(current_user.id), "name": current_user.name, "phone": current_user.phone, "created_at": current_user.created_at.isoformat() if current_user.created_at else None}


@router.put("/me", summary="Mettre à jour mon profil")
def update_my_profile(body: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = current_user
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


@router.get("/me/summary", summary="Résumé financier (moi)")
def get_my_financial_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = current_user
    user_id = str(user.id)
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

class OnboardingData(BaseModel):
    name: str
    phone: str
    invite_code: str


@router.post("/onboarding", summary="Créer compte et rejoindre une tontine en 1 étape")
def onboarding(body: OnboardingData, db: Session = Depends(get_db)):
    # 1. Trouve la tontine
    from ..models.tontine import Tontine
    from ..models.payment import TontineMember, Cycle, Payment

    tontine = db.query(Tontine).filter(
        Tontine.invite_code == body.invite_code.upper()
    ).first()
    if not tontine:
        raise HTTPException(404, "Code d'invitation invalide")

    # 2. Crée ou récupère l'utilisateur
    user = db.query(User).filter(User.phone == body.phone).first()
    if not user:
        user = User(name=body.name.strip(), phone=body.phone.strip())
        db.add(user)
        db.flush()
    else:
        # Met à jour le nom si compte existant
        user.name = body.name.strip()

    # 3. Vérifie qu'il n'est pas déjà membre
    existing = db.query(TontineMember).filter(
        TontineMember.tontine_id == tontine.id,
        TontineMember.user_id == user.id,
    ).first()

    if not existing:
        # 4. Ajoute comme membre
        member = TontineMember(
            tontine_id=tontine.id,
            user_id=user.id,
            order_index=len(tontine.members) + 1,
        )
        db.add(member)
        db.flush()

        # 5. Crée le versement en attente
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

        # 6. Notifie le gérant
        from ..services.notifications import notify_new_member
        notify_new_member(db, str(tontine.manager_id), user.name, tontine.name)

    db.commit()

    return {
        "message": f"Bienvenue dans {tontine.name} !",
        "user_id": str(user.id),
        "name": user.name,
        "tontine_id": str(tontine.id),
        "tontine_name": tontine.name,
        "already_member": existing is not None,
    }


class WelcomeMessage(BaseModel):
    message: str

@router.put("/{user_id}/avatar", summary="Changer la photo de profil (URL ou emoji)")
def update_avatar(user_id: str, avatar: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    user.avatar = avatar
    db.commit()
    return {"message": "Avatar mis à jour", "avatar": avatar}


@router.delete("/{user_id}", summary="Supprimer son compte")
def delete_account(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    # Vérifie qu'il n'est pas gérant d'une tontine active
    from ..models.tontine import Tontine
    managed = db.query(Tontine).filter(Tontine.manager_id == user_id).first()
    if managed:
        raise HTTPException(400, "Tu es gérant d'une tontine. Transfère la gestion avant de supprimer ton compte.")
    db.delete(user)
    db.commit()
    return {"message": "Compte supprimé"}


class WelcomeMessage(BaseModel):
    message: str

@router.put("/{user_id}/avatar", summary="Changer la photo de profil (URL ou emoji)")
def update_avatar(user_id: str, avatar: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    user.avatar = avatar
    db.commit()
    return {"message": "Avatar mis à jour", "avatar": avatar}


@router.delete("/{user_id}", summary="Supprimer son compte")
def delete_account(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    # Vérifie qu'il n'est pas gérant d'une tontine active
    from ..models.tontine import Tontine
    managed = db.query(Tontine).filter(Tontine.manager_id == user_id).first()
    if managed:
        raise HTTPException(400, "Tu es gérant d'une tontine. Transfère la gestion avant de supprimer ton compte.")
    db.delete(user)
    db.commit()
    return {"message": "Compte supprimé"}

@router.get("/admin/stats", summary="Statistiques générales")
def get_admin_stats(db: Session = Depends(get_db)):
    from ..models.tontine import Tontine
    from ..models.payment import Payment, TontineMember

    total_users    = db.query(User).count()
    total_tontines = db.query(Tontine).count()
    total_members  = db.query(TontineMember).count()
    total_payments = db.query(Payment).filter(Payment.is_validated == True).count()
    total_amount   = db.query(Payment).filter(
        Payment.is_validated == True
    ).with_entities(func.sum(Payment.amount)).scalar() or 0

    from sqlalchemy import func
    return {
        "total_users":    total_users,
        "total_tontines": total_tontines,
        "total_members":  total_members,
        "total_payments": total_payments,
        "total_amount":   float(total_amount),
    }