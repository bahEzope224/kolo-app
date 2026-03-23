#!/usr/bin/env bash
set -e

# ============================================================
#  KOLO — Script de création du projet
#  Usage : chmod +x setup-kolo.sh && ./setup-kolo.sh
# ============================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${BLUE}→${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }

echo ""
echo -e "${GREEN}"
echo "  ██╗  ██╗ ██████╗ ██╗      ██████╗ "
echo "  ██║ ██╔╝██╔═══██╗██║     ██╔═══██╗"
echo "  █████╔╝ ██║   ██║██║     ██║   ██║"
echo "  ██╔═██╗ ██║   ██║██║     ██║   ██║"
echo "  ██║  ██╗╚██████╔╝███████╗╚██████╔╝"
echo "  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝ ╚═════╝ "
echo -e "${NC}"
echo "  Tontine collective simplifiée"
echo "  ================================"
echo ""

# ------------------------------------------------------------
# 1. STRUCTURE DES DOSSIERS
# ------------------------------------------------------------
info "Création de la structure des dossiers..."

mkdir -p kolo/{backend,frontend}
mkdir -p kolo/backend/app/{models,schemas,routers,services}
mkdir -p kolo/backend/alembic/versions
mkdir -p kolo/frontend/src/{api,pages,components,hooks}
mkdir -p kolo/frontend/public

log "Dossiers créés"

# ------------------------------------------------------------
# 2. BACKEND — requirements.txt
# ------------------------------------------------------------
cat > kolo/backend/requirements.txt << 'EOF'
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
alembic==1.13.1
psycopg2-binary==2.9.9
pydantic[email]==2.7.1
pydantic-settings==2.2.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
twilio==9.0.5
httpx==0.27.0
EOF
log "requirements.txt"

# ------------------------------------------------------------
# 3. BACKEND — .env.example
# ------------------------------------------------------------
cat > kolo/backend/.env.example << 'EOF'
DATABASE_URL=postgresql://kolo:kolo@localhost:5432/kolo
SECRET_KEY=change-this-super-secret-key-32-chars-minimum
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Twilio (créer un compte sur twilio.com)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+33xxxxxxxxx

# Environnement
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173
EOF
log ".env.example"

# Copie .env pour le dev local
cp kolo/backend/.env.example kolo/backend/.env

# ------------------------------------------------------------
# 4. BACKEND — app/__init__.py
# ------------------------------------------------------------
touch kolo/backend/app/__init__.py
touch kolo/backend/app/models/__init__.py
touch kolo/backend/app/schemas/__init__.py
touch kolo/backend/app/routers/__init__.py
touch kolo/backend/app/services/__init__.py
log "Fichiers __init__.py"

# ------------------------------------------------------------
# 5. BACKEND — config.py
# ------------------------------------------------------------
cat > kolo/backend/app/config.py << 'EOF'
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 10080  # 7 jours
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_phone_number: str
    environment: str = "development"
    cors_origins: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
EOF
log "config.py"

# ------------------------------------------------------------
# 6. BACKEND — database.py
# ------------------------------------------------------------
cat > kolo/backend/app/database.py << 'EOF'
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
EOF
log "database.py"

# ------------------------------------------------------------
# 7. BACKEND — models/user.py
# ------------------------------------------------------------
cat > kolo/backend/app/models/user.py << 'EOF'
import uuid
from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    otp_code = Column(String(6), nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
EOF
log "models/user.py"

# ------------------------------------------------------------
# 8. BACKEND — models/tontine.py
# ------------------------------------------------------------
cat > kolo/backend/app/models/tontine.py << 'EOF'
import enum
import uuid
from sqlalchemy import Column, Date, Enum, ForeignKey, Integer, Numeric, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class DistributionMode(str, enum.Enum):
    random = "random"
    fixed = "fixed"
    manual = "manual"


class Tontine(Base):
    __tablename__ = "tontines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    contribution_amount = Column(Numeric(10, 2), nullable=False)
    start_date = Column(Date, nullable=False)
    mode = Column(Enum(DistributionMode), default=DistributionMode.random)
    invite_code = Column(String(8), unique=True, nullable=False)
    current_cycle = Column(Integer, default=1)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    manager = relationship("User", foreign_keys=[manager_id])
    members = relationship("TontineMember", back_populates="tontine")
    cycles = relationship("Cycle", back_populates="tontine")
EOF
log "models/tontine.py"

# ------------------------------------------------------------
# 9. BACKEND — models/payment.py
# ------------------------------------------------------------
cat > kolo/backend/app/models/payment.py << 'EOF'
import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class TontineMember(Base):
    __tablename__ = "tontine_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tontine_id = Column(UUID(as_uuid=True), ForeignKey("tontines.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, server_default=func.now())
    order_index = Column(Integer, nullable=True)

    tontine = relationship("Tontine", back_populates="members")
    user = relationship("User")


class Cycle(Base):
    __tablename__ = "cycles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tontine_id = Column(UUID(as_uuid=True), ForeignKey("tontines.id"), nullable=False)
    cycle_number = Column(Integer, nullable=False)
    beneficiary_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    total_amount = Column(Numeric(10, 2), nullable=True)
    completed_at = Column(DateTime, nullable=True)

    tontine = relationship("Tontine", back_populates="cycles")
    payments = relationship("Payment", back_populates="cycle")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cycle_id = Column(UUID(as_uuid=True), ForeignKey("cycles.id"), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    is_validated = Column(Boolean, default=False)
    validated_at = Column(DateTime, nullable=True)
    receipt_photo_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    cycle = relationship("Cycle", back_populates="payments")
    member = relationship("User")
EOF
log "models/payment.py"

# ------------------------------------------------------------
# 10. BACKEND — schemas/
# ------------------------------------------------------------
cat > kolo/backend/app/schemas/user.py << 'EOF'
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class UserBase(BaseModel):
    phone: str
    name: str


class UserCreate(UserBase):
    pass


class UserOut(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class OtpRequest(BaseModel):
    phone: str


class OtpVerify(BaseModel):
    phone: str
    code: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    name: str
EOF

cat > kolo/backend/app/schemas/tontine.py << 'EOF'
from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from ..models.tontine import DistributionMode


class TontineCreate(BaseModel):
    name: str
    contribution_amount: Decimal
    start_date: date
    mode: DistributionMode = DistributionMode.random


class TontineOut(BaseModel):
    id: UUID
    name: str
    contribution_amount: Decimal
    start_date: date
    mode: DistributionMode
    invite_code: str
    current_cycle: int
    created_at: datetime

    class Config:
        from_attributes = True


class MemberInvite(BaseModel):
    name: str
    phone: str
EOF

cat > kolo/backend/app/schemas/payment.py << 'EOF'
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional


class PaymentOut(BaseModel):
    id: UUID
    member_name: str
    member_phone: str
    amount: Decimal
    is_validated: bool
    validated_at: Optional[datetime]

    class Config:
        from_attributes = True
EOF
log "schemas/"

# ------------------------------------------------------------
# 11. BACKEND — services/sms.py
# ------------------------------------------------------------
cat > kolo/backend/app/services/sms.py << 'EOF'
from twilio.rest import Client
from ..config import settings

_client = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    return _client


async def send_otp_sms(phone: str, otp: str) -> None:
    get_client().messages.create(
        body=f"Kolo - Ton code de connexion : {otp}\nValable 10 minutes. Ne le partage jamais.",
        from_=settings.twilio_phone_number,
        to=phone,
    )


async def send_notification(phone: str, message: str) -> None:
    get_client().messages.create(
        body=f"Kolo - {message}",
        from_=settings.twilio_phone_number,
        to=phone,
    )
EOF
log "services/sms.py"

# ------------------------------------------------------------
# 12. BACKEND — services/notifications.py
# ------------------------------------------------------------
cat > kolo/backend/app/services/notifications.py << 'EOF'
from .sms import send_notification


async def notify_payment_validated(phone: str, member_name: str, amount: float) -> None:
    await send_notification(phone, f"Versement de {member_name} validé ({amount}€). Merci !")


async def notify_beneficiary(phone: str, name: str, amount: float) -> None:
    await send_notification(phone, f"C'est ton tour {name} ! Tu vas recevoir {amount}€. Contacte ton gérant.")


async def notify_late_payment(phone: str, name: str) -> None:
    await send_notification(phone, f"Rappel : ton versement du mois est en attente. Contacte ton gérant.")
EOF
log "services/notifications.py"

# ------------------------------------------------------------
# 13. BACKEND — routers/auth.py
# ------------------------------------------------------------
cat > kolo/backend/app/routers/auth.py << 'EOF'
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
from ..services.sms import send_otp_sms

router = APIRouter(prefix="/auth", tags=["Authentification"])


def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.secret_key, algorithm="HS256")


@router.post("/request-otp", summary="Demander un code SMS")
async def request_otp(body: OtpRequest, db: Session = Depends(get_db)):
    phone = body.phone.strip().replace(" ", "")
    user = db.query(User).filter(User.phone == phone).first()

    if not user:
        raise HTTPException(404, "Numéro non enregistré. Demande à ton gérant de t'inviter.")

    otp = "".join(random.choices(string.digits, k=6))
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    await send_otp_sms(phone, otp)
    return {"message": "Code envoyé par SMS"}


@router.post("/verify-otp", response_model=TokenOut, summary="Vérifier le code SMS")
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
EOF
log "routers/auth.py"

# ------------------------------------------------------------
# 14. BACKEND — routers/tontines.py
# ------------------------------------------------------------
cat > kolo/backend/app/routers/tontines.py << 'EOF'
import random
import string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.tontine import Tontine
from ..schemas.tontine import TontineCreate, TontineOut

router = APIRouter(prefix="/tontines", tags=["Tontines"])


def generate_invite_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


@router.post("/", response_model=TontineOut, summary="Créer une tontine")
def create_tontine(body: TontineCreate, manager_id: str, db: Session = Depends(get_db)):
    code = generate_invite_code()
    while db.query(Tontine).filter(Tontine.invite_code == code).first():
        code = generate_invite_code()

    tontine = Tontine(**body.model_dump(), invite_code=code, manager_id=manager_id)
    db.add(tontine)
    db.commit()
    db.refresh(tontine)
    return tontine


@router.get("/{tontine_id}", response_model=TontineOut, summary="Détail d'une tontine")
def get_tontine(tontine_id: str, db: Session = Depends(get_db)):
    tontine = db.query(Tontine).filter(Tontine.id == tontine_id).first()
    if not tontine:
        raise HTTPException(404, "Tontine introuvable")
    return tontine


@router.get("/join/{code}", summary="Rejoindre via code d'invitation")
def get_tontine_by_code(code: str, db: Session = Depends(get_db)):
    tontine = db.query(Tontine).filter(Tontine.invite_code == code.upper()).first()
    if not tontine:
        raise HTTPException(404, "Code invalide")
    return {"id": str(tontine.id), "name": tontine.name, "contribution_amount": float(tontine.contribution_amount)}
EOF
log "routers/tontines.py"

# ------------------------------------------------------------
# 15. BACKEND — routers/members.py
# ------------------------------------------------------------
cat > kolo/backend/app/routers/members.py << 'EOF'
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.payment import TontineMember
from ..models.tontine import Tontine
from ..models.user import User
from ..schemas.tontine import MemberInvite

router = APIRouter(prefix="/members", tags=["Membres"])


@router.get("/{tontine_id}", summary="Liste des membres")
def list_members(tontine_id: str, db: Session = Depends(get_db)):
    members = (
        db.query(TontineMember)
        .filter(TontineMember.tontine_id == tontine_id)
        .all()
    )
    return [
        {
            "id": str(m.id),
            "user_id": str(m.user_id),
            "name": m.user.name,
            "phone": m.user.phone,
            "joined_at": m.joined_at.isoformat(),
        }
        for m in members
    ]


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

    member = TontineMember(tontine_id=tontine_id, user_id=user.id)
    db.add(member)
    db.commit()

    return {"message": f"{body.name} ajouté(e) avec succès", "invite_link": f"https://kolo.app/join/{tontine.invite_code}"}
EOF
log "routers/members.py"

# ------------------------------------------------------------
# 16. BACKEND — routers/payments.py
# ------------------------------------------------------------
cat > kolo/backend/app/routers/payments.py << 'EOF'
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.payment import Cycle, Payment, TontineMember
from ..models.tontine import Tontine
from ..services.notifications import notify_payment_validated, notify_beneficiary

router = APIRouter(prefix="/payments", tags=["Versements"])


@router.get("/cycle/{cycle_id}", summary="Versements d'un cycle")
def get_cycle_payments(cycle_id: str, db: Session = Depends(get_db)):
    payments = db.query(Payment).filter(Payment.cycle_id == cycle_id).all()
    return [
        {
            "id": str(p.id),
            "member_name": p.member.name,
            "member_phone": p.member.phone,
            "amount": float(p.amount),
            "is_validated": p.is_validated,
            "validated_at": p.validated_at.isoformat() if p.validated_at else None,
        }
        for p in payments
    ]


@router.post("/{payment_id}/validate", summary="Valider un versement")
async def validate_payment(payment_id: str, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(404, "Versement introuvable")
    if payment.is_validated:
        raise HTTPException(400, "Déjà validé")

    payment.is_validated = True
    payment.validated_at = datetime.utcnow()
    db.commit()

    await notify_payment_validated(payment.member.phone, payment.member.name, float(payment.amount))
    return {"message": "Versement validé", "payment_id": str(payment.id)}


@router.post("/tontine/{tontine_id}/draw", summary="Tirage au sort du bénéficiaire")
async def draw_beneficiary(tontine_id: str, db: Session = Depends(get_db)):
    tontine = db.query(Tontine).filter(Tontine.id == tontine_id).first()
    if not tontine:
        raise HTTPException(404, "Tontine introuvable")

    members = db.query(TontineMember).filter(TontineMember.tontine_id == tontine_id).all()
    if not members:
        raise HTTPException(400, "Aucun membre dans la tontine")

    winner = random.choice(members)
    total = float(tontine.contribution_amount) * len(members)

    cycle = Cycle(
        tontine_id=tontine_id,
        cycle_number=tontine.current_cycle,
        beneficiary_id=winner.user_id,
        total_amount=total,
    )
    db.add(cycle)
    tontine.current_cycle += 1
    db.commit()

    await notify_beneficiary(winner.user.phone, winner.user.name, total)
    return {
        "beneficiary_name": winner.user.name,
        "beneficiary_phone": winner.user.phone,
        "total_amount": total,
        "cycle_number": cycle.cycle_number,
    }
EOF
log "routers/payments.py"

# ------------------------------------------------------------
# 17. BACKEND — main.py
# ------------------------------------------------------------
cat > kolo/backend/app/main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import auth, members, payments, tontines

app = FastAPI(
    title="Kolo API",
    version="1.0.0",
    description="API pour la gestion de tontines collectives",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tontines.router)
app.include_router(members.router)
app.include_router(payments.router)


@app.get("/health", tags=["Système"])
def health():
    return {"status": "ok", "app": "Kolo", "version": "1.0.0"}
EOF
log "main.py"

# ------------------------------------------------------------
# 18. BACKEND — Dockerfile
# ------------------------------------------------------------
cat > kolo/backend/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF
log "Dockerfile backend"

# ------------------------------------------------------------
# 19. BACKEND — alembic.ini + env.py
# ------------------------------------------------------------
cat > kolo/backend/alembic.ini << 'EOF'
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = postgresql://kolo:kolo@localhost:5432/kolo

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
EOF

cat > kolo/backend/alembic/env.py << 'EOF'
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import Base
from app.models import user, tontine, payment  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
EOF
log "Alembic configuré"

# ------------------------------------------------------------
# 20. FRONTEND — package.json
# ------------------------------------------------------------
cat > kolo/frontend/package.json << 'EOF'
{
  "name": "kolo",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",
    "@tanstack/react-query": "^5.40.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.2.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
EOF
log "package.json"

# ------------------------------------------------------------
# 21. FRONTEND — vite.config.js
# ------------------------------------------------------------
cat > kolo/frontend/vite.config.js << 'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
EOF
log "vite.config.js"

# ------------------------------------------------------------
# 22. FRONTEND — Tailwind
# ------------------------------------------------------------
cat > kolo/frontend/tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "ui-sans-serif", "system-ui"],
      },
      colors: {
        kolo: {
          green: "#10B981",
          dark: "#065F46",
        },
      },
    },
  },
  plugins: [],
};
EOF

cat > kolo/frontend/postcss.config.js << 'EOF'
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
EOF
log "Tailwind configuré"

# ------------------------------------------------------------
# 23. FRONTEND — index.html
# ------------------------------------------------------------
cat > kolo/frontend/index.html << 'EOF'
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#065F46" />
    <title>Kolo — Tontine collective</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF
log "index.html"

# ------------------------------------------------------------
# 24. FRONTEND — src/main.jsx
# ------------------------------------------------------------
cat > kolo/frontend/src/main.jsx << 'EOF'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

cat > kolo/frontend/src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }

body {
  font-family: "Sora", sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Boutons tactiles confortables (min 48px) */
button { min-height: 48px; }
input  { min-height: 48px; }
EOF
log "main.jsx + index.css"

# ------------------------------------------------------------
# 25. FRONTEND — src/api/client.js
# ------------------------------------------------------------
cat > kolo/frontend/src/api/client.js << 'EOF'
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kolo_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("kolo_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────
export const requestOtp = (phone) =>
  api.post("/auth/request-otp", { phone });

export const verifyOtp = (phone, code) =>
  api.post("/auth/verify-otp", { phone, code });

// ── Tontines ──────────────────────────────────────────────
export const getTontine = (id) => api.get(`/tontines/${id}`);
export const createTontine = (data, managerId) =>
  api.post(`/tontines/?manager_id=${managerId}`, data);

// ── Membres ───────────────────────────────────────────────
export const getMembers = (tontineId) => api.get(`/members/${tontineId}`);
export const inviteMember = (tontineId, data) =>
  api.post(`/members/${tontineId}/invite`, data);

// ── Versements ────────────────────────────────────────────
export const getCyclePayments = (cycleId) =>
  api.get(`/payments/cycle/${cycleId}`);

export const validatePayment = (paymentId) =>
  api.post(`/payments/${paymentId}/validate`);

export const drawBeneficiary = (tontineId) =>
  api.post(`/payments/tontine/${tontineId}/draw`);
EOF
log "api/client.js"

# ------------------------------------------------------------
# 26. FRONTEND — hooks/useAuth.js
# ------------------------------------------------------------
cat > kolo/frontend/src/hooks/useAuth.js << 'EOF'
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestOtp, verifyOtp } from "../api/client";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const sendCode = async (phone) => {
    setLoading(true);
    setError("");
    try {
      await requestOtp(phone);
      return true;
    } catch (e) {
      setError(e.response?.data?.detail || "Numéro non reconnu. Contacte ton gérant.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (phone, code) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await verifyOtp(phone, code);
      localStorage.setItem("kolo_token", data.access_token);
      localStorage.setItem("kolo_user", JSON.stringify({ id: data.user_id, name: data.name }));
      navigate("/");
      return true;
    } catch (e) {
      setError("Code incorrect ou expiré. Réessaie.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("kolo_token");
    localStorage.removeItem("kolo_user");
    navigate("/login");
  };

  const getUser = () => {
    const raw = localStorage.getItem("kolo_user");
    return raw ? JSON.parse(raw) : null;
  };

  return { sendCode, verifyCode, logout, getUser, loading, error, setError };
}
EOF
log "hooks/useAuth.js"

# ------------------------------------------------------------
# 27. FRONTEND — pages/Login.jsx
# ------------------------------------------------------------
cat > kolo/frontend/src/pages/Login.jsx << 'EOF'
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const { sendCode, verifyCode, loading, error, setError } = useAuth();

  async function handlePhone() {
    if (phone.length < 8) { setError("Entre ton numéro de téléphone"); return; }
    const ok = await sendCode(phone);
    if (ok) setStep("code");
  }

  async function handleCode() {
    if (code.length !== 6) { setError("Le code fait 6 chiffres"); return; }
    await verifyCode(phone, code);
  }

  return (
    <div className="min-h-screen bg-emerald-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl">
            🌿
          </div>
          <h1 className="text-2xl font-black text-slate-900">Kolo</h1>
          <p className="text-slate-500 text-sm mt-1">Tontine collective simplifiée</p>
        </div>

        {step === "phone" ? (
          <>
            <p className="text-slate-700 font-semibold mb-3 text-lg">Ton numéro de téléphone</p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(""); }}
              placeholder="+33 6 12 34 56 78"
              inputMode="tel"
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-4 text-lg focus:outline-none focus:border-emerald-400 mb-4"
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <button
              onClick={handlePhone}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl text-lg transition disabled:opacity-60"
            >
              {loading ? "Envoi en cours…" : "Recevoir mon code →"}
            </button>
          </>
        ) : (
          <>
            <p className="text-slate-700 font-semibold mb-1 text-lg">Code reçu par SMS</p>
            <p className="text-slate-400 text-sm mb-5">Envoyé au {phone}</p>
            <input
              type="number"
              value={code}
              onChange={(e) => { setCode(e.target.value.slice(0, 6)); setError(""); }}
              placeholder="123456"
              inputMode="numeric"
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-4 text-4xl font-black text-center tracking-widest focus:outline-none focus:border-emerald-400 mb-4"
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <button
              onClick={handleCode}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl text-lg transition disabled:opacity-60"
            >
              {loading ? "Vérification…" : "Connexion →"}
            </button>
            <button
              onClick={() => { setStep("phone"); setCode(""); setError(""); }}
              className="w-full mt-3 text-slate-400 text-sm underline bg-transparent border-none min-h-0 py-2"
            >
              ← Changer de numéro
            </button>
          </>
        )}
      </div>
    </div>
  );
}
EOF
log "pages/Login.jsx"

# ------------------------------------------------------------
# 28. FRONTEND — pages/Dashboard.jsx (squelette)
# ------------------------------------------------------------
cat > kolo/frontend/src/pages/Dashboard.jsx << 'EOF'
import { useAuth } from "../hooks/useAuth";

export default function Dashboard() {
  const { getUser, logout } = useAuth();
  const user = getUser();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="font-black text-lg">Kolo</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-300">{user?.name}</span>
          <button
            onClick={logout}
            className="text-xs text-slate-400 underline min-h-0 py-1 bg-transparent border-none"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
          <p className="text-4xl mb-4">👋</p>
          <h2 className="text-xl font-bold text-slate-800">Bonjour, {user?.name} !</h2>
          <p className="text-slate-500 mt-2">Ton tableau de bord Kolo est prêt.</p>
          <p className="text-slate-400 text-sm mt-4">
            Connecte-toi à une tontine pour commencer.
          </p>
        </div>
      </main>
    </div>
  );
}
EOF
log "pages/Dashboard.jsx"

# ------------------------------------------------------------
# 29. FRONTEND — pages/Payments.jsx (squelette)
# ------------------------------------------------------------
cat > kolo/frontend/src/pages/Payments.jsx << 'EOF'
export default function Payments() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400">Page versements — à développer</p>
    </div>
  );
}
EOF

cat > kolo/frontend/src/pages/History.jsx << 'EOF'
export default function History() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400">Page historique — à développer</p>
    </div>
  );
}
EOF
log "pages/Payments.jsx + History.jsx"

# ------------------------------------------------------------
# 30. FRONTEND — components/Toast.jsx
# ------------------------------------------------------------
cat > kolo/frontend/src/components/Toast.jsx << 'EOF'
import { useEffect } from "react";

export default function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-semibold shadow-lg z-50 animate-bounce">
      {message}
    </div>
  );
}
EOF

cat > kolo/frontend/src/components/MemberCard.jsx << 'EOF'
const STATUS = {
  paid:    { label: "Payé ✓",       cls: "bg-emerald-100 text-emerald-800" },
  pending: { label: "En attente",   cls: "bg-amber-100 text-amber-800" },
  late:    { label: "En retard ⚠",  cls: "bg-red-100 text-red-800" },
};

export default function MemberCard({ name, phone, status, onValidate, isGerant }) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
      <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
        {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800 truncate">{name}</p>
        <p className="text-slate-400 text-sm">{phone}</p>
      </div>
      {status === "paid" || !isGerant ? (
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${s.cls}`}>{s.label}</span>
      ) : (
        <button
          onClick={onValidate}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition min-h-0"
        >
          Valider
        </button>
      )}
    </div>
  );
}
EOF
log "components/"

# ------------------------------------------------------------
# 31. FRONTEND — App.jsx
# ------------------------------------------------------------
cat > kolo/frontend/src/App.jsx << 'EOF'
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Payments from "./pages/Payments";
import History from "./pages/History";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Protected({ children }) {
  return localStorage.getItem("kolo_token") ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/"         element={<Protected><Dashboard /></Protected>} />
          <Route path="/payments" element={<Protected><Payments /></Protected>} />
          <Route path="/history"  element={<Protected><History /></Protected>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
EOF
log "App.jsx"

# ------------------------------------------------------------
# 32. FRONTEND — .env.example
# ------------------------------------------------------------
cat > kolo/frontend/.env.example << 'EOF'
VITE_API_URL=http://localhost:8000
EOF
cp kolo/frontend/.env.example kolo/frontend/.env
log ".env frontend"

# ------------------------------------------------------------
# 33. .gitignore global
# ------------------------------------------------------------
cat > kolo/.gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
venv/
.env

# Node
node_modules/
dist/
.env

# Divers
.DS_Store
*.log
EOF
log ".gitignore"

# ------------------------------------------------------------
# 34. README.md
# ------------------------------------------------------------
cat > kolo/README.md << 'EOF'
# 🌿 Kolo — Tontine collective simplifiée

## Démarrage rapide

### Prérequis
- Python 3.11+
- Node.js 18+
- Docker (pour PostgreSQL)

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # Remplis les variables Twilio

# Lance PostgreSQL
docker run -d --name kolo-db \
  -e POSTGRES_DB=kolo -e POSTGRES_USER=kolo -e POSTGRES_PASSWORD=kolo \
  -p 5432:5432 postgres:16

# Migrations
alembic revision --autogenerate -m "init"
alembic upgrade head

# Serveur
uvicorn app.main:app --reload
# → http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## Stack
- **Back** : FastAPI · PostgreSQL · SQLAlchemy · Alembic
- **Front** : React · Vite · Tailwind CSS · React Query
- **Auth** : SMS OTP via Twilio
- **Deploy** : Railway (back + BDD) · Vercel (front)
EOF
log "README.md"

# ------------------------------------------------------------
# RÉSUMÉ FINAL
# ------------------------------------------------------------
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Projet Kolo créé avec succès !${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "  Structure générée :"
find kolo -type f | sort | sed 's/^/    /'
echo ""
echo -e "  ${BLUE}Prochaines étapes :${NC}"
echo ""
echo "  1. Remplis kolo/backend/.env  (Twilio + DB)"
echo "  2. Lance PostgreSQL via Docker"
echo "  3. cd kolo/backend && source venv/bin/activate"
echo "     pip install -r requirements.txt"
echo "     alembic revision --autogenerate -m init"
echo "     alembic upgrade head"
echo "     uvicorn app.main:app --reload"
echo ""
echo "  4. cd kolo/frontend && npm install && npm run dev"
echo ""
echo -e "  ${GREEN}→ Swagger API : http://localhost:8000/docs${NC}"
echo -e "  ${GREEN}→ App React   : http://localhost:5173${NC}"
echo ""