import logging
from collections import defaultdict
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.exceptions import RefusedError, StorageError
from core.integrations.rustfs.rustfs_client import RustFSClient
from modules.file.business.private_files import store_private_file
from modules.file.models.file_models import File
from modules.lot.models.lot_models import LotPhoto
from modules.lot.types.lot_types import LotPhotoStep


logger = logging.getLogger(__name__)


def keep_lot_photo(db: Session, storage: RustFSClient, lot_id: UUID, step: LotPhotoStep, data_url: str, actor_id: UUID, taken_at: datetime, was_recorded_offline: bool) -> bool:
    """
    Store the photo of a Lot's step in the caller's transaction; one that can't be read or stored is left out, never the Lot.

    Args:
        db (Session): Session of the Lot's change.
        storage (RustFSClient): RustFS client.
        lot_id (UUID): The Lot.
        step (LotPhotoStep): Step it was taken at.
        data_url (str): The photo.
        actor_id (UUID): Who took it.
        taken_at (datetime): When the step happened.
        was_recorded_offline (bool): Whether the step waited in the outbox.

    Returns:
        bool: True when the photo was kept.
    """
    try:
        file = store_private_file(db, storage, data_url, f"lot-{step.value}.jpg", actor_id)
    except (RefusedError, StorageError):
        logger.exception("Photo of lot %s at %s was not kept", lot_id, step.value)
        return False
    db.flush()
    db.add(LotPhoto(lot_id=lot_id, step=step, file_id=file.id, entered_at=taken_at, was_recorded_offline=was_recorded_offline, created_by_id=actor_id))
    return True


def list_photo_steps(db: Session, lot_ids: list[UUID]) -> dict[UUID, list[LotPhotoStep]]:
    """
    Find which steps of each Lot have a photo, in one query; their signed URLs are read apart, so the list's answer doesn't change each time.

    Args:
        db (Session): Session to read with.
        lot_ids (list[UUID]): Lots.

    Returns:
        dict[UUID, list[LotPhotoStep]]: Steps by Lot.
    """
    steps: dict[UUID, list[LotPhotoStep]] = defaultdict(list)
    for lot_id, step in db.execute(select(LotPhoto.lot_id, LotPhoto.step).where(LotPhoto.lot_id.in_(lot_ids)).distinct().order_by(LotPhoto.lot_id, LotPhoto.step)):
        steps[lot_id].append(step)
    return steps


def build_photo_urls(db: Session, storage: RustFSClient, lot_id: UUID) -> dict[LotPhotoStep, str]:
    """
    Sign the URL of each photo of a Lot, the latest one per step.

    Args:
        db (Session): Session to read with.
        storage (RustFSClient): RustFS client.
        lot_id (UUID): The Lot.

    Returns:
        dict[LotPhotoStep, str]: Signed URLs by step.
    """
    rows = db.execute(select(LotPhoto.step, File.storage_key).join(File, File.id == LotPhoto.file_id).where(LotPhoto.lot_id == lot_id).order_by(LotPhoto.entered_at, LotPhoto.id))
    return {step: storage.build_signed_url(storage_key) for step, storage_key in rows}
