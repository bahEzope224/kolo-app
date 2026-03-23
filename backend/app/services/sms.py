from twilio.rest import Client
from ..config import settings

_client = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    return _client


async def send_otp_sms(phone: str, otp: str) -> None:
    get_client().messages.create(
        body=f"Kolo - Ton code de connexion : {otp}\nValable 10 minutes. Ne le partage jamais.",
        from_=settings.twilio_phone_number,
        to=phone,
    )


async def send_notification(phone: str, message: str) -> None:
    get_client().messages.create(
        body=f"Kolo - {message}",
        from_=settings.twilio_phone_number,
        to=phone,
    )
