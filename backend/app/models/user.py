import uuid
from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String(20), unique=True, nullable=True, index=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    email = Column(String(100), unique=True, nullable=True, index=True)
    avatar = Column(String, nullable=True, default="🌿")
    clerk_id = Column(String(100), unique=True, nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())

    # Dépracated - used for old OTP system
    otp_code = Column(String(6), nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
