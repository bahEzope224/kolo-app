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
