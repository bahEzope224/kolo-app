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
