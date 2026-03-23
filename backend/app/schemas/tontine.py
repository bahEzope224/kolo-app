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
