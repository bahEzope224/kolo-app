import uuid
import enum
from sqlalchemy import Column, String, Enum, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class TransferStatus(str, enum.Enum):
    pending  = "pending"
    accepted = "accepted"
    refused  = "refused"


class TransferRequest(Base):
    __tablename__ = "transfer_requests"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tontine_id   = Column(UUID(as_uuid=True), ForeignKey("tontines.id"),  nullable=False)
    from_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"),     nullable=False)
    to_user_id   = Column(UUID(as_uuid=True), ForeignKey("users.id"),     nullable=False)
    status       = Column(Enum(TransferStatus), default=TransferStatus.pending)
    created_at   = Column(DateTime, server_default=func.now())
    responded_at = Column(DateTime, nullable=True)

    # Pas de relationship ici pour éviter les conflits — on fait les jointures manuellement