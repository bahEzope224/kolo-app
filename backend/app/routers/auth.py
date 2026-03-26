import random
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models.user import User
from ..schemas.user import OtpRequest, OtpVerify, TokenOut

router = APIRouter(prefix="/auth", tags=["Authentification"])

# ── Mode dev : code fixe ──────────────────────────────────
DEV_MODE = settings.environment == "development"
DEV_OTP   = "123456"


def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.secret_key, algorithm="HS256")


@router.post("/request-otp", summary="Demander un code SMS")
async def request_otp(body: OtpRequest, db: Session = Depends(get_db)):
    phone = body.phone.strip().replace(" ", "")
    user = db.query(User).filter(User.phone == phone).first()

    if not user:
        raise HTTPException(404, "Numéro non enregistré. Demande à ton gérant de t'inviter ou créer un nouveau compte.")

    if DEV_MODE:
        # En dev : code fixe, pas de SMS
        otp = DEV_OTP
        print(f"\n🔑 [DEV] Code OTP pour {phone} : {otp}\n")
    else:
        # En prod : vrai SMS Twilio
        from ..services.sms import send_otp_sms
        otp = "".join(random.choices(string.digits, k=6))
        await send_otp_sms(phone, otp)

    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    return {"message": "Code envoyé" if not DEV_MODE else "Mode dev — utilise le code 123456"}


@router.post("/verify-otp", response_model=TokenOut, summary="Vérifier le code")
async def verify_otp(body: OtpVerify, db: Session = Depends(get_db)):
    phone = body.phone.strip().replace(" ", "")
    user = db.query(User).filter(User.phone == phone).first()

    if not user or user.otp_code != body.code:
        raise HTTPException(400, "Code incorrect")
    if not user.otp_expires_at or user.otp_expires_at < datetime.utcnow():
        raise HTTPException(400, "Code expiré. Refais la demande.")

    user.otp_code = None
    user.otp_expires_at = None
    db.commit()

    return {
        "access_token": create_token(str(user.id)),
        "token_type": "bearer",
        "user_id": str(user.id),
        "name": user.name,
    }