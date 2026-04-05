from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models.user import User
from ..models.payment import TontineMember, Payment, Cycle
from ..models.tontine import Tontine
from sqlalchemy import func

from ..deps import get_current_user
from ..services.r2 import upload_file_to_r2

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
    if not current_user.name or current_user.name == "Utilisateur Kolo" or current_user.name == "Nouvel utilisateur":
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
        "email": current_user.email,
        "avatar": current_user.avatar,
        "is_admin": current_user.is_admin,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }


# ── ROUTES ADMINISTRATION ──────────────────────────────────

@router.get("/admin/stats", summary="Statistiques globales (Admin)")
def get_admin_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(403, "Accès réservé à l'administrateur")

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


# ── GESTION PROFIL ───────────────────────────────────────

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

    return {"message": "Profil mis à jour", "name": user.name, "phone": user.phone}


@router.put("/me/avatar", summary="Changer sa photo de profil")
def update_avatar(avatar: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.avatar = avatar
    db.commit()
    return {"message": "Avatar mis à jour", "avatar": avatar}


@router.post("/me/avatar/upload", summary="Uploader une photo de profil (R2)")
async def upload_avatar_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Le fichier n'est pas une image")
    
    # Limite à 2Mo
    MAX_SIZE = 2 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "L'image est trop lourde (max 2Mo)")

    try:
        url = upload_file_to_r2(content, file.filename, file.content_type)
        current_user.avatar = url
        db.commit()
        return {"avatar": url}
    except Exception as e:
        raise HTTPException(500, f"Erreur lors de l'upload : {str(e)}")


@router.delete("/me", summary="Supprimer son compte")
def delete_account(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Vérifie qu'il n'est pas gérant d'une tontine active
    from ..models.tontine import Tontine
    managed = db.query(Tontine).filter(Tontine.manager_id == current_user.id).first()
    if managed:
        raise HTTPException(400, "Tu es gérant d'une tontine. Transfère la gestion avant de supprimer ton compte.")
    
    db.delete(current_user)
    db.commit()
    return {"message": "Compte supprimé"}


@router.get("/me/summary", summary="Résumé financier personnel")
def get_my_financial_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = str(current_user.id)

    # Total versé
    payments = db.query(Payment).filter(
        Payment.member_id == user_id,
        Payment.is_validated == True,
    ).all()
    total_paid = sum(float(p.amount) for p in payments)

    # Total reçu
    received_cycles = db.query(Cycle).filter(
        Cycle.beneficiary_id == user_id,
        Cycle.completed_at.isnot(None),
    ).all()
    total_received = sum(float(c.total_amount) for c in received_cycles if c.total_amount)

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
        "active_tontines": len(memberships),
        "tontines": tontines_detail,
    }


# ── ONBOARDING ──────────────────────────────────────────

class OnboardingData(BaseModel):
    name: str
    phone: str
    invite_code: str


@router.post("/onboarding", summary="Créer compte et rejoindre une tontine en 1 étape")
def onboarding(body: OnboardingData, db: Session = Depends(get_db)):
    tontine = db.query(Tontine).filter(
        Tontine.invite_code == body.invite_code.upper()
    ).first()
    if not tontine:
        raise HTTPException(404, "Code d'invitation invalide")

    user = db.query(User).filter(User.phone == body.phone).first()
    if not user:
        user = User(name=body.name.strip(), phone=body.phone.strip())
        db.add(user)
        db.flush()
    else:
        user.name = body.name.strip()

    existing = db.query(TontineMember).filter(
        TontineMember.tontine_id == tontine.id,
        TontineMember.user_id == user.id,
    ).first()

    if not existing:
        member = TontineMember(
            tontine_id=tontine.id,
            user_id=user.id,
            order_index=len(tontine.members) + 1,
        )
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