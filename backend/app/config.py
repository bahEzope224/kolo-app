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
