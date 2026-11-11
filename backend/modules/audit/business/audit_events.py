from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from modules.audit.models.audit_models import AuditEvent


def record_audit_event(
    db: Session,
    actor_id: UUID | None,
    action: str,
    site_id: UUID | None = None,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    event_id: UUID | None = None,
) -> AuditEvent:
    """
    Add one entry to the Audit Trail in the caller's transaction, so it is saved with the change it describes.

    Args:
        db (Session): Session of the change.
        actor_id (UUID | None): User who acted.
        action (str): Dotted verb, such as configuration.value_set.
        site_id (UUID | None): Site the change happened on.
        entity_type (str | None): Kind of record changed.
        entity_id (UUID | None): Record changed.
        before (dict[str, Any] | None): Changed fields before.
        after (dict[str, Any] | None): Changed fields after.
        event_id (UUID | None): Id minted by the front, so a retried request is recognized.

    Returns:
        AuditEvent: The event, added but not committed.
    """
    event = AuditEvent(
        occurred_at=datetime.now(timezone.utc),
        actor_id=actor_id,
        site_id=site_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before=before,
        after=after,
    )
    if event_id is not None:
        event.id = event_id
    db.add(event)
    return event
