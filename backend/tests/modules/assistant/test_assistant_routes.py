from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from core.integrations.redis.redis_stream_client import get_redis_stream_client
from main import app
from modules.user.types.user_types import Permission, Role
from tests.factories import build_auth_header, create_site, create_staff_user


class FakeStreams:
    def __init__(self) -> None:
        """
        Keep stream values in memory instead of Redis.
        """
        self.values: dict[str, str] = {}

    def publish(self, stream: str, event: str, data: dict[str, Any]) -> str:
        """
        Accept an event.

        Args:
            stream (str): Stream key.
            event (str): Event name.
            data (dict[str, Any]): Payload.

        Returns:
            str: A fake id.
        """
        return "1-0"

    def set_value(self, key: str, value: str) -> None:
        """
        Keep a value.

        Args:
            key (str): Key.
            value (str): Value.
        """
        self.values[key] = value


@pytest.fixture
def streams(monkeypatch: pytest.MonkeyPatch) -> FakeStreams:
    """
    Replace Redis streams and the Celery publisher for route tests.

    Args:
        monkeypatch (pytest.MonkeyPatch): Patcher.

    Returns:
        FakeStreams: The in-memory streams.
    """
    fake = FakeStreams()
    app.dependency_overrides[get_redis_stream_client] = lambda: fake
    monkeypatch.setattr("modules.assistant.services.assistant_services.publish_task", lambda *args: True)
    return fake


def test_only_management_reaches_the_assistant(client: TestClient, db: Session, streams: FakeStreams) -> None:
    """
    An Operator or an Accountant is refused (the Assistant is gated by the Management Role).
    """
    site = create_site(db, "RA")
    for role in (Role.OPERATOR, Role.ACCOUNTANT):
        user = create_staff_user(db, f"+2126{uuid4().int % 10**8:08d}", role, {site.id: [Permission.FINANCE_VIEW]})
        headers = build_auth_header(user, {site.id: [Permission.FINANCE_VIEW]})
        assert client.post("/api/assistant/questions", json={"text": "CA ?"}, headers=headers).json()["code"] == "management_only"
        assert client.get("/api/assistant/conversations", headers=headers).status_code == 403


def test_a_question_is_saved_once_and_stays_private(client: TestClient, db: Session, streams: FakeStreams) -> None:
    """
    Replaying the same id answers the same question; another manager never sees the Conversation.
    """
    site = create_site(db, "RB")
    owner = create_staff_user(db, f"+2126{uuid4().int % 10**8:08d}", Role.MANAGEMENT, is_owner=True)
    other = create_staff_user(db, f"+2126{uuid4().int % 10**8:08d}", Role.MANAGEMENT, {site.id: [Permission.FINANCE_VIEW]})
    question_id = str(uuid4())
    body = {"text": "Combien de lots cette saison ?", "requestId": question_id, "siteId": str(site.id), "period": "season"}

    first = client.post("/api/assistant/questions", json=body, headers=build_auth_header(owner))
    replay = client.post("/api/assistant/questions", json=body, headers=build_auth_header(owner))
    conversation_id = first.json()["conversationId"]

    assert first.status_code == 201
    assert first.json()["id"] == question_id == replay.json()["id"]
    assert first.json()["status"] == "pending"
    assert client.get(f"/api/assistant/conversations/{conversation_id}", headers=build_auth_header(other, {site.id: [Permission.FINANCE_VIEW]})).status_code == 404
    assert client.get("/api/assistant/conversations", headers=build_auth_header(owner)).json()["total"] >= 1


def test_a_site_not_held_is_refused(client: TestClient, db: Session, streams: FakeStreams) -> None:
    """
    A manager asking about a Site they do not hold is refused before anything is saved.
    """
    held, other = create_site(db, "RC"), create_site(db, "RD")
    manager = create_staff_user(db, f"+2126{uuid4().int % 10**8:08d}", Role.MANAGEMENT, {held.id: [Permission.FINANCE_VIEW]})

    answer = client.post("/api/assistant/questions", json={"text": "CA ?", "siteId": str(other.id)}, headers=build_auth_header(manager, {held.id: [Permission.FINANCE_VIEW]}))

    assert answer.json()["code"] == "site_forbidden"


def test_a_recording_must_be_short_and_audio(client: TestClient, db: Session, streams: FakeStreams) -> None:
    """
    An empty, unknown or over-long recording is refused before any AI call.
    """
    owner = create_staff_user(db, f"+2126{uuid4().int % 10**8:08d}", Role.MANAGEMENT, is_owner=True)
    headers = build_auth_header(owner)

    for content, content_type, seconds in ((b"", "audio/webm", "3"), (b"abc", "text/plain", "3"), (b"abc", "audio/webm", "90")):
        answer = client.post("/api/assistant/transcriptions", files={"audio": ("q.webm", content, content_type)}, data={"durationInSeconds": seconds}, headers=headers)
        assert answer.json()["code"] == "assistant_audio_invalid"


def test_only_an_owner_reads_ai_settings_and_usage(client: TestClient, db: Session) -> None:
    """
    Provider keys, the AI Budget and usage are for Owners; other managers are refused.
    """
    site = create_site(db, "RE")
    owner = create_staff_user(db, f"+2126{uuid4().int % 10**8:08d}", Role.MANAGEMENT, is_owner=True)
    manager = create_staff_user(db, f"+2126{uuid4().int % 10**8:08d}", Role.MANAGEMENT, {site.id: list(Permission)})

    settings = client.get("/api/ai/settings", headers=build_auth_header(owner))

    assert settings.status_code == 200
    assert {feature["feature"] for feature in settings.json()["features"]} == {"assistant", "assistant_transcription"}
    assert client.get("/api/ai/usage", headers=build_auth_header(manager, {site.id: list(Permission)})).json()["code"] == "owner_only"
