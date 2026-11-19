from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from uuid_utils.compat import uuid7

from core.exceptions import MessageDeliveryError
from modules.client.models.client_models import Client
from modules.configuration.models.configuration_models import NotificationChannelSetting
from modules.configuration.types.configuration_types import NotificationChannel
from modules.lot.models.lot_models import Lot, Notification
from modules.lot.services.notification_services import NotificationService
from modules.lot.types.lot_types import NotificationChoice, NotificationStatus
from tests.modules.lot.test_lot_move_routes import API_URL, prepare_lot


class FakeMail:
    """
    Stands in for the SMTP client: keeps what it was asked to send, or refuses like a mail server down.
    """

    def __init__(self, is_down: bool = False) -> None:
        """
        Args:
            is_down (bool): Whether every send fails.
        """
        self.is_down = is_down
        self.sent: list[tuple[str, str, str]] = []

    def send(self, recipient: str, subject: str, body: str) -> None:
        """
        Keep or refuse one email.

        Args:
            recipient (str): Address.
            subject (str): Subject.
            body (str): Body.
        """
        if self.is_down:
            raise MessageDeliveryError("smtp_unreachable")
        self.sent.append((recipient, subject, body))


@pytest.fixture
def published(monkeypatch: pytest.MonkeyPatch) -> list[tuple[Any, ...]]:
    """
    Catch the tasks the move service publishes instead of reaching the broker.

    Args:
        monkeypatch (pytest.MonkeyPatch): Patcher.

    Returns:
        list[tuple[Any, ...]]: Task name and arguments of each publish.
    """
    calls: list[tuple[Any, ...]] = []
    monkeypatch.setattr("modules.lot.services.lot_move_services.publish_task", lambda task_name, *args: calls.append((task_name, *args)) or True)
    return calls


def press(client: TestClient, db: Session, choice: NotificationChoice, is_email_on: bool) -> tuple[Lot, dict]:
    """
    Press a Lot whose Client chose a channel at Reception, with the email channel on or off for the company.

    Returns:
        tuple[Lot, dict]: The Lot and the API's answer once pressed.
    """
    lot, _, _, headers = prepare_lot(db)
    lot.notification_choice = choice
    db.get(Client, lot.client_id).email = "client@example.ma"
    db.merge(NotificationChannelSetting(channel=NotificationChannel.EMAIL, is_enabled=is_email_on))
    db.commit()
    client.post(f"{API_URL}/{lot.id}/moves", json={"id": str(uuid7())}, headers=headers)
    pressed = client.post(f"{API_URL}/{lot.id}/moves", json={"id": str(uuid7()), "oilLitres": 200, "handedLitres": 200}, headers=headers).json()
    return lot, pressed


def test_a_lot_whose_channel_was_switched_off_sends_nothing(client: TestClient, db: Session, published: list) -> None:
    """
    WhatsApp chosen, but not available to the company: the Timeline shows the message was not sent, and no task leaves.
    """
    _, pressed = press(client, db, NotificationChoice.WHATSAPP, is_email_on=True)

    assert [(item["channel"], item["isFailed"], item["failureReason"]) for item in pressed["notifications"]] == [("whatsapp", True, "channel_disabled")]
    assert published == []


def test_an_enabled_email_is_queued_then_sent_by_the_task(client: TestClient, db: Session, published: list) -> None:
    """
    Email on and an address known: the Notification waits for the task, which sends it and records it sent.
    """
    lot, pressed = press(client, db, NotificationChoice.EMAIL, is_email_on=True)
    notification = db.scalars(select(Notification).where(Notification.lot_id == lot.id)).one()
    mail = FakeMail()

    NotificationService(db, mail).send_notification(notification.id, is_last_attempt=False)
    db.refresh(notification)

    assert pressed["notifications"][0]["isFailed"] is False
    assert published == [("lot.send_notification", str(notification.id))]
    assert notification.status == NotificationStatus.SENT
    assert mail.sent[0][0] == "client@example.ma" and "200 L" in mail.sent[0][2]


def test_an_email_the_server_keeps_refusing_ends_failed_with_the_error(client: TestClient, db: Session, published: list) -> None:
    """
    Retries raise while attempts remain; the last one records the failure for the Timeline.
    """
    lot, _ = press(client, db, NotificationChoice.EMAIL, is_email_on=True)
    notification = db.scalars(select(Notification).where(Notification.lot_id == lot.id)).one()
    service = NotificationService(db, FakeMail(is_down=True))

    with pytest.raises(MessageDeliveryError):
        service.send_notification(notification.id, is_last_attempt=False)
    service.send_notification(notification.id, is_last_attempt=True)
    db.refresh(notification)

    assert (notification.status, notification.failure_reason) == (NotificationStatus.FAILED, "smtp_unreachable")
