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
