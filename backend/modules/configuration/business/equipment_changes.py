from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.exceptions import RefusedError
from modules.configuration.models.configuration_models import Box, PressLine, Tank
from modules.configuration.types.configuration_types import BoxesUpdate, PressLineSettingOut, TankSettingOut
from modules.lot.models.lot_models import BoxOccupancy, Lot
from modules.lot.types.lot_types import LotStatus
from modules.oil.models.oil_models import Storage


BUSY_LOT_STATUSES = (LotStatus.WAITING, LotStatus.PRESSING)


def list_boxes(db: Session, site_id: UUID) -> list[Box]:
    """
    List the Boxes a Site uses, by number.

    Args:
        db (Session): Session to read with.
        site_id (UUID): Site.

    Returns:
        list[Box]: Boxes not retired.
    """
    return list(db.scalars(select(Box).where(Box.site_id == site_id, Box.retired_at.is_(None)).order_by(Box.number)))


def list_tanks(db: Session, site_id: UUID) -> list[Tank]:
    """
    List the Tanks a Site uses, by number.

    Args:
        db (Session): Session to read with.
        site_id (UUID): Site.

    Returns:
        list[Tank]: Tanks not retired.
    """
    return list(db.scalars(select(Tank).where(Tank.site_id == site_id, Tank.retired_at.is_(None)).order_by(Tank.number)))


def list_press_lines(db: Session, site_id: UUID) -> list[PressLine]:
    """
    List the Press Lines a Site uses, by number.

    Args:
        db (Session): Session to read with.
        site_id (UUID): Site.

    Returns:
        list[PressLine]: Press Lines not retired.
    """
    return list(db.scalars(select(PressLine).where(PressLine.site_id == site_id, PressLine.retired_at.is_(None)).order_by(PressLine.number)))


def get_next_number(db: Session, equipment: type[Tank] | type[PressLine], site_id: UUID) -> int:
    """
    Find the next number a Site may give a Tank or a Press Line; a retired one keeps its number (B18).

    Args:
        db (Session): Session to read with.
        equipment (type[Tank] | type[PressLine]): Kind of equipment.
        site_id (UUID): Site.

    Returns:
        int: The next free number.
    """
    return (db.scalar(select(func.max(equipment.number)).where(equipment.site_id == site_id)) or 0) + 1


def change_boxes(db: Session, site_id: UUID, update: BoxesUpdate, actor_id: UUID, now: datetime, can_delete: bool) -> tuple[dict, dict]:
    """
    Set how many Boxes a Site has and their capacity: Boxes past the count leave, missing ones are added or brought back.

    Args:
        db (Session): Session of the change.
        site_id (UUID): Site changed.
        update (BoxesUpdate): Box count and capacity.
        actor_id (UUID): User who changed it.
        now (datetime): Time of the change.
        can_delete (bool): Whether a Box no Lot ever used is deleted instead of retired.

    Returns:
        tuple[dict, dict]: The Boxes before and after, as the history shows them.

    Raises:
        RefusedError: box_in_use when a Box to remove still holds a Lot.
    """
    boxes = {box.number: box for box in db.scalars(select(Box).where(Box.site_id == site_id))}
    active = [box for box in boxes.values() if box.retired_at is None]
    before = {"boxCount": len(active), "boxCapacityKg": float(active[0].capacity_in_kg) if active else None}
    leaving = [box for box in active if box.number > update.count]
    leaving_ids = [box.id for box in leaving]
    if leaving and db.scalar(select(BoxOccupancy.id).where(BoxOccupancy.box_id.in_(leaving_ids), BoxOccupancy.occupied_until.is_(None)).limit(1)):
        raise RefusedError("box_in_use")
    used_ids = set(db.scalars(select(BoxOccupancy.box_id).where(BoxOccupancy.box_id.in_(leaving_ids)).distinct())) if leaving else set()
    capacity = Decimal(str(update.capacity_kg))
    for number in range(1, update.count + 1):
        box = boxes.get(number) or Box(site_id=site_id, number=number, created_by_id=actor_id)
        box.capacity_in_kg = capacity
        box.retired_at = None
        box.updated_by_id = actor_id
        db.add(box)
    remove_equipment(db, leaving, used_ids, actor_id, now, can_delete)
    return {"key": "boxes", "equipment": before}, {"key": "boxes", "value": None, "method": None, "equipment": {"boxCount": update.count, "boxCapacityKg": update.capacity_kg}}


def change_tanks(db: Session, site_id: UUID, tanks: list[TankSettingOut], actor_id: UUID, now: datetime, can_delete: bool) -> tuple[dict, dict]:
    """
    Replace a Site's list of Tanks: missing ones leave if empty, new ones are added, kept ones resized.

    Args:
        db (Session): Session of the change.
        site_id (UUID): Site changed.
        tanks (list[TankSettingOut]): The Tanks the Site keeps.
        actor_id (UUID): User who changed it.
        now (datetime): Time of the change.
        can_delete (bool): Whether a Tank that never held oil is deleted instead of retired.

    Returns:
        tuple[dict, dict]: The Tanks before and after, as the history shows them.

    Raises:
        RefusedError: tank_in_use when a Tank to remove still holds oil; number_taken when a number was already used.
    """
    existing = {tank.id: tank for tank in db.scalars(select(Tank).where(Tank.site_id == site_id))}
    before = [map_tank(tank).model_dump(mode="json", by_alias=True) for tank in list_tanks(db, site_id)]
    kept_ids = {tank.id for tank in tanks}
    leaving = [tank for tank in existing.values() if tank.id not in kept_ids and tank.retired_at is None]
    leaving_ids = [tank.id for tank in leaving]
    if leaving and db.scalar(select(Storage.id).where(Storage.tank_id.in_(leaving_ids), Storage.ended_at.is_(None)).limit(1)):
        raise RefusedError("tank_in_use")
    check_numbers_free([(tank.id, tank.number) for tank in tanks], {tank.id: tank.number for tank in existing.values()})
    for tank_setting in tanks:
        tank = existing.get(tank_setting.id) or Tank(id=tank_setting.id, site_id=site_id, created_by_id=actor_id)
        tank.number = tank_setting.number
        tank.capacity_in_litres = Decimal(str(tank_setting.capacity_litres))
        tank.updated_by_id = actor_id
        db.add(tank)
    used_ids = set(db.scalars(select(Storage.tank_id).where(Storage.tank_id.in_(leaving_ids)).distinct())) if leaving else set()
    remove_equipment(db, leaving, used_ids, actor_id, now, can_delete)
    return {"key": "tanks", "equipment": {"tanks": before}}, {"key": "tanks", "value": None, "method": None, "equipment": {"tanks": [tank.model_dump(mode="json", by_alias=True) for tank in tanks]}}


def change_press_lines(db: Session, site_id: UUID, press_lines: list[PressLineSettingOut], actor_id: UUID, now: datetime, can_delete: bool) -> tuple[dict, dict]:
    """
    Replace a Site's list of Press Lines: missing ones leave if no Lot waits or presses on them, new ones are added, kept ones renamed.

    Args:
        db (Session): Session of the change.
        site_id (UUID): Site changed.
        press_lines (list[PressLineSettingOut]): The Press Lines the Site keeps.
        actor_id (UUID): User who changed it.
        now (datetime): Time of the change.
        can_delete (bool): Whether a Press Line no Lot ever used is deleted instead of retired.

    Returns:
        tuple[dict, dict]: The Press Lines before and after, as the history shows them.

    Raises:
        RefusedError: line_in_use when a Lot is planned or pressing on a line to remove; number_taken when a number was already used.
    """
    existing = {line.id: line for line in db.scalars(select(PressLine).where(PressLine.site_id == site_id))}
    before = [map_press_line(line).model_dump(mode="json", by_alias=True) for line in list_press_lines(db, site_id)]
    kept_ids = {line.id for line in press_lines}
    leaving = [line for line in existing.values() if line.id not in kept_ids and line.retired_at is None]
    leaving_ids = [line.id for line in leaving]
    if leaving and db.scalar(select(Lot.id).where(Lot.press_line_id.in_(leaving_ids), Lot.status.in_(BUSY_LOT_STATUSES)).limit(1)):
        raise RefusedError("line_in_use")
    check_numbers_free([(line.id, line.number) for line in press_lines], {line.id: line.number for line in existing.values()})
    for line_setting in press_lines:
        line = existing.get(line_setting.id) or PressLine(id=line_setting.id, site_id=site_id, created_by_id=actor_id)
        line.number = line_setting.number
        line.name = line_setting.name.strip() or None
        line.updated_by_id = actor_id
        db.add(line)
    used_ids = set(db.scalars(select(Lot.press_line_id).where(Lot.press_line_id.in_(leaving_ids)).distinct())) if leaving else set()
    remove_equipment(db, leaving, used_ids, actor_id, now, can_delete)
    return {"key": "pressLines", "equipment": {"pressLines": before}}, {"key": "pressLines", "value": None, "method": None, "equipment": {"pressLines": [line.model_dump(mode="json", by_alias=True) for line in press_lines]}}


def remove_equipment(db: Session, leaving: list[Box] | list[Tank] | list[PressLine], used_ids: set[UUID | None], actor_id: UUID, now: datetime, can_delete: bool) -> None:
    """
    Take equipment out of a Site: deleted when it was never used and the actor may delete, otherwise retired.

    Args:
        db (Session): Session of the change.
        leaving (list[Box] | list[Tank] | list[PressLine]): Equipment to remove.
        used_ids (set[UUID | None]): Those a Lot or a Storage ever used.
        actor_id (UUID): User who changed it.
        now (datetime): Time of the change.
        can_delete (bool): Whether never-used equipment is deleted.
    """
    for item in leaving:
        if can_delete and item.id not in used_ids:
            db.delete(item)
        else:
            item.retired_at = now
            item.updated_by_id = actor_id


def check_numbers_free(wanted: list[tuple[UUID, int]], existing_numbers: dict[UUID, int]) -> None:
    """
    Refuse a Tank or Press Line number used twice in the list, or already given to another one, retired or not.

    Args:
        wanted (list[tuple[UUID, int]]): Id and number of each item kept or added.
        existing_numbers (dict[UUID, int]): Number of every item the Site ever had, by id.

    Raises:
        RefusedError: number_taken.
    """
    numbers = [number for _, number in wanted]
    if len(numbers) != len(set(numbers)):
        raise RefusedError("number_taken", 422)
    for item_id, number in wanted:
        if any(other_number == number and other_id != item_id for other_id, other_number in existing_numbers.items()):
            raise RefusedError("number_taken", 422)


def map_tank(tank: Tank) -> TankSettingOut:
    """
    Shape a Tank for the Configuration page.

    Args:
        tank (Tank): The Tank.

    Returns:
        TankSettingOut: Its number and capacity.
    """
    return TankSettingOut(id=tank.id, number=tank.number, capacity_litres=float(tank.capacity_in_litres))


def map_press_line(line: PressLine) -> PressLineSettingOut:
    """
    Shape a Press Line for the Configuration page.

    Args:
        line (PressLine): The Press Line.

    Returns:
        PressLineSettingOut: Its number and name.
    """
    return PressLineSettingOut(id=line.id, number=line.number, name=line.name or "")
