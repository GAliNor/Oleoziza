from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from modules.oil.models.oil_models import Storage, StorageDraw


def get_tank_fills(db: Session, tank_ids: list[UUID]) -> dict[UUID, Decimal]:
    """
    Read how many litres each Tank holds now: what its open Storages put in, minus what was drawn, in two queries.

    Args:
        db (Session): Session to read with.
        tank_ids (list[UUID]): Tanks to read.

    Returns:
        dict[UUID, Decimal]: Litres held per Tank (0 for an empty one).
    """
    fills = {tank_id: Decimal(0) for tank_id in tank_ids}
    stored = select(Storage.tank_id, func.sum(Storage.oil_in_litres)).where(Storage.tank_id.in_(tank_ids), Storage.ended_at.is_(None)).group_by(Storage.tank_id)
    for tank_id, litres in db.execute(stored):
        fills[tank_id] += litres
    drawn = (
        select(Storage.tank_id, func.sum(StorageDraw.oil_in_litres))
        .join(Storage, Storage.id == StorageDraw.storage_id)
        .where(Storage.tank_id.in_(tank_ids), Storage.ended_at.is_(None), StorageDraw.is_reversed.is_(False))
        .group_by(Storage.tank_id)
    )
    for tank_id, litres in db.execute(drawn):
        fills[tank_id] -= litres
    return fills


def get_storage_remainders(db: Session, storages: list[Storage]) -> dict[UUID, Decimal]:
    """
    Read what is left in each Storage after its draws, in one query.

    Args:
        db (Session): Session to read with.
        storages (list[Storage]): Storages to read.

    Returns:
        dict[UUID, Decimal]: Litres left per Storage.
    """
    remainders = {storage.id: storage.oil_in_litres for storage in storages}
    if not storages:
        return remainders
    drawn = select(StorageDraw.storage_id, func.sum(StorageDraw.oil_in_litres)).where(StorageDraw.storage_id.in_(list(remainders)), StorageDraw.is_reversed.is_(False)).group_by(StorageDraw.storage_id)
    for storage_id, litres in db.execute(drawn):
        remainders[storage_id] -= litres
    return remainders
