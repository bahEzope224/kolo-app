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
    payments = relationship("Payment", back_populates="cycle", cascade="all, delete-orphan")


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
