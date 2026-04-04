from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str
    secret_key: str = "826b6785e9f4acd761df87fa2b1d74045b1eb929633cc2935580930c0425df7b"
    access_token_expire_minutes: int = 10080

    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    
    clerk_secret_key: Optional[str] = None
    clerk_publishable_key: Optional[str] = None
    clerk_jwt_issuer: Optional[str] = None # URL de l'instance Clerk pour la validation

    environment: str = "development"
    cors_origins: str = "https://kolo-app-two.vercel.app/,http://localhost:5173"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()