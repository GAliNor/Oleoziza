from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import create_engine, select
from sqlalchemy.orm import DeclarativeBase, Session

from core.model_mixins import HumanCodeMixin, IdMixin, OfflineEntryMixin, SlugIdMixin


class SampleBase(DeclarativeBase):
    """
    Declarative base kept apart from the app's metadata, for mixin tests only.
    """


class SampleEntry(IdMixin, OfflineEntryMixin, HumanCodeMixin, SampleBase):
    """
    Row combining the mixins an offline-capable business record uses.
    """

    __tablename__ = "sample_entries"


class SampleReference(SlugIdMixin, SampleBase):
    """
    Row standing for reference data keyed by a slug.
    """

    __tablename__ = "sample_references"


def build_session() -> Session:
    """
    Open a session on an in-memory SQLite database holding the sample tables.

    Returns:
        Session: Session bound to the fresh database.
    """
    engine = create_engine("sqlite://")
    SampleBase.metadata.create_all(engine)
    return Session(engine)


def test_server_minted_id_is_uuid_v7() -> None:
    """
    A row saved without an id gets a time-ordered UUID v7.
    """
    with build_session() as session:
        session.add(SampleEntry(entered_at=datetime.now(timezone.utc)))
        session.commit()
        saved_entry = session.scalars(select(SampleEntry)).one()

    assert isinstance(saved_entry.id, UUID)
    assert saved_entry.id.version == 7


def test_device_minted_id_is_kept() -> None:
    """
    A row arriving from a phone keeps the id the phone minted, so a replayed sync finds the same row.
    """
    device_id = UUID("01970000-0000-7000-8000-000000000001")
    with build_session() as session:
        session.add(SampleEntry(id=device_id, entered_at=datetime.now(timezone.utc), was_recorded_offline=True, device_label="Poste réception"))
        session.commit()
        saved_entry = session.get(SampleEntry, device_id)

    assert saved_entry is not None
    assert saved_entry.was_recorded_offline is True
    assert saved_entry.device_label == "Poste réception"


def test_offline_flag_defaults_to_false_and_code_starts_empty() -> None:
    """
    An entry typed online is not flagged offline, and has no code until the server gives one.
    """
    with build_session() as session:
        session.add(SampleEntry(entered_at=datetime.now(timezone.utc)))
        session.commit()
        saved_entry = session.scalars(select(SampleEntry)).one()

    assert saved_entry.was_recorded_offline is False
    assert saved_entry.code is None


def test_code_is_unique() -> None:
    """
    Two rows can never share the same readable code.
    """
    assert SampleEntry.__table__.c.code.unique is True


def test_slug_id_is_the_given_text() -> None:
    """
    Reference data is keyed by its slug as given.
    """
    with build_session() as session:
        session.add(SampleReference(id="oujda-angad"))
        session.commit()
        saved_reference = session.get(SampleReference, "oujda-angad")

    assert saved_reference is not None
