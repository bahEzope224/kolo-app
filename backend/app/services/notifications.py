from sqlalchemy.orm import Session
from ..models.notification import Notification, NotifType


def create_notif(db: Session, user_id: str, type: NotifType, title: str, body: str):
    notif = Notification(user_id=user_id, type=type, title=title, body=body)
    db.add(notif)
    # Ne pas commit ici — le caller commit après


def notify_payment_validated(db: Session, member_id: str, member_name: str, amount: float):
    create_notif(
        db, member_id,
        NotifType.payment_validated,
        "Versement validé ✓",
        f"Ton versement de {amount}€ a été validé par le gérant.",
    )


def notify_beneficiary_all(db: Session, member_ids: list, beneficiary_name: str, amount: float, cycle: int):
    for uid in member_ids:
        create_notif(
            db, uid,
            NotifType.beneficiary,
            f"🎲 Bénéficiaire du cycle {cycle}",
            f"{beneficiary_name} a été désigné(e) bénéficiaire et recevra {amount}€.",
        )


def notify_new_member(db: Session, manager_id: str, member_name: str, tontine_name: str):
    create_notif(
        db, manager_id,
        NotifType.new_member,
        "Nouveau membre 👥",
        f"{member_name} a rejoint la tontine {tontine_name}.",
    )


def notify_late_members(db: Session, late_member_ids: list, tontine_name: str):
    for uid in late_member_ids:
        create_notif(
            db, uid,
            NotifType.late_reminder,
            "Rappel versement ⏰",
            f"Ton versement pour la tontine {tontine_name} est en attente. Contacte ton gérant.",
        )