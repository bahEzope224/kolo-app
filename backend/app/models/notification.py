import uuid
import enum
from sqlalchemy import Column, String, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class NotifType(str, enum.Enum):
    payment_validated = "payment_validated"
    late_reminder     = "late_reminder"
    # beneficiary       = "beneficiary"
    new_member        = "new_member"


class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type       = Column(Enum(NotifType), nullable=False)
    title      = Column(String(100), nullable=False)
    body       = Column(Text, nullable=False)
    is_read    = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")