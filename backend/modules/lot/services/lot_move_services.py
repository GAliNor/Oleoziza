from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from core.database import get_db
from core.integrations.celery.celery_publisher import publish_task
from core.exceptions import RefusedError
from core.integrations.rustfs.rustfs_client import RustFSClient, get_rustfs_client
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.audit.models.audit_models import AuditEvent
from modules.client.models.client_models import Client
from modules.configuration.models.configuration_models import PressLine, Tank
from modules.lot.business.lot_notifications import build_pressed_notification
from modules.lot.business.lot_photos import keep_lot_photo
from modules.lot.business.lot_views import build_lot_views
from modules.lot.models.lot_models import BoxOccupancy, Lot, Notification
from modules.lot.services.lot_services import LotService
from modules.lot.types.lot_types import SEND_LOT_NOTIFICATION_TASK, LotMode, LotMoveIn, LotOut, LotPhotoStep, LotScheduleIn, LotStatus, NotificationStatus, TankPourIn
from modules.oil.business.tank_fill import get_storage_remainders, get_tank_fills
from modules.oil.models.oil_models import Storage, StorageDraw, Withdrawal, WithdrawalLine
from modules.oil.types.oil_types import StorageDrawReason, StorageOwner, WithdrawalKind
from modules.site.business.code_sequences import give_next_code
from modules.site.models.site_models import Season, Site
from modules.site.types.site_types import CodeKind
from modules.user.types.user_types import Permission


LOT_MOVED_ACTION = "lot.moved"

LOT_SCHEDULED_ACTION = "lot.scheduled"

PHOTO_STEP_AFTER = {LotStatus.WAITING: LotPhotoStep.PRESSING_STARTED, LotStatus.PRESSING: LotPhotoStep.PRESSED, LotStatus.PRESSED: LotPhotoStep.WITHDRAWAL}


class LotMoveService:
    def __init__(self, db: Session, current_user: CurrentUser, storage: RustFSClient) -> None:
        """
        Keep the session, the Operator moving Lots along their statuses, and the storage of their photos.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
            storage (RustFSClient): RustFS client.
        """
        self.db = db
        self.current_user = current_user
        self.storage = storage
        self.lots = LotService(db, current_user, storage)
        self.queued_notifications: list[Notification] = []

    def move_lot(self, lot_id: UUID, payload: LotMoveIn) -> LotOut:
        """
        Move a Lot one step: start its Pressing, end it with its oil, or withdraw what is left; a replayed step answers the Lot as it is.

        Args:
            lot_id (UUID): Lot to move.
            payload (LotMoveIn): The step.

        Returns:
            LotOut: The Lot after the step.

        Raises:
            RefusedError: lot_not_found, lots_forbidden, lot_already_withdrawn, lot_without_line, line_busy, oil_required, tank_not_found, tank_full, oil_split_invalid.
        """
        lot = self.lots.get_lot_row(lot_id)
        if self.db.get(AuditEvent, payload.id) is not None:
            return build_lot_views(self.db, [lot])[0]
        if not (self.current_user.has_permission(lot.site_id, Permission.PRESSING_CREATE) or self.current_user.has_permission(lot.site_id, Permission.LOT_UPDATE_STATUS)):
            raise RefusedError("lots_forbidden", 403)
        now = payload.entered_at or datetime.now(timezone.utc)
        before = lot.status
        if lot.status == LotStatus.WAITING:
            self._start_pressing(lot, payload, now)
        elif lot.status == LotStatus.PRESSING:
            self._end_pressing(lot, payload, now)
        elif lot.status == LotStatus.PRESSED:
            self._withdraw_rest(lot, now)
        else:
            raise RefusedError("lot_already_withdrawn")
        if payload.photo_url:
            keep_lot_photo(self.db, self.storage, lot.id, PHOTO_STEP_AFTER[before], payload.photo_url, self.current_user.id, now, payload.recorded_offline)
        self.db.flush()
        record_audit_event(self.db, self.current_user.id, LOT_MOVED_ACTION, site_id=lot.site_id, entity_type="lot", entity_id=lot.id, before={"status": before.value}, after={"status": lot.status.value}, event_id=payload.id)
        self.db.commit()
        for notification in self.queued_notifications:
            publish_task(SEND_LOT_NOTIFICATION_TASK, str(notification.id))
        return build_lot_views(self.db, [lot])[0]

    def schedule_lot(self, lot_id: UUID, payload: LotScheduleIn) -> LotOut:
        """
        Give a waiting Lot its Press Line, or move it to another one or another planned start; a replay answers the Lot as it is.

        Args:
            lot_id (UUID): Lot to plan.
            payload (LotScheduleIn): Line and planned start.

        Returns:
            LotOut: The Lot as planned.

        Raises:
            RefusedError: lot_not_found, lots_forbidden, lot_already_pressing, press_line_not_found.
        """
        lot = self.lots.get_lot_row(lot_id)
        if self.db.get(AuditEvent, payload.id) is not None:
            return build_lot_views(self.db, [lot])[0]
        if not (self.current_user.has_permission(lot.site_id, Permission.RECEPTION_CREATE) or self.current_user.has_permission(lot.site_id, Permission.LOT_UPDATE_STATUS)):
            raise RefusedError("lots_forbidden", 403)
        if lot.status != LotStatus.WAITING:
            raise RefusedError("lot_already_pressing")
        line = self.db.get(PressLine, payload.press_line_id)
        if line is None or line.site_id != lot.site_id or line.retired_at is not None:
            raise RefusedError("press_line_not_found", 422)
        before = {"pressLineId": str(lot.press_line_id) if lot.press_line_id else None, "plannedStartAt": lot.planned_start_at.isoformat() if lot.planned_start_at else None}
        lot.press_line_id = line.id
        lot.planned_start_at = payload.planned_start_at
        record_audit_event(self.db, self.current_user.id, LOT_SCHEDULED_ACTION, site_id=lot.site_id, entity_type="lot", entity_id=lot.id, before=before, after={"pressLineId": str(line.id), "plannedStartAt": payload.planned_start_at.isoformat()}, event_id=payload.id)
        self.db.commit()
        return build_lot_views(self.db, [lot])[0]

    def _start_pressing(self, lot: Lot, payload: LotMoveIn, now: datetime) -> None:
        """
        Start a Lot's Pressing on its Press Line, freeing its Boxes; one Lot presses on a Line at a time.

        Args:
            lot (Lot): Waiting Lot.
            payload (LotMoveIn): The step, possibly naming another Line.
            now (datetime): When it started.

        Raises:
            RefusedError: lot_without_line, line_busy.
        """
        line_id = payload.press_line_id or lot.press_line_id
        line = self.db.get(PressLine, line_id) if line_id else None
        if line is None or line.site_id != lot.site_id:
            raise RefusedError("lot_without_line", 422)
        if self.db.scalar(select(Lot.id).where(Lot.press_line_id == line.id, Lot.status == LotStatus.PRESSING, Lot.id != lot.id).limit(1)):
            raise RefusedError("line_busy")
        lot.press_line_id = line.id
        lot.planned_start_at = lot.planned_start_at or now
        lot.status = LotStatus.PRESSING
        lot.pressing_started_at = now
        lot.pressing_started_by_id = self.current_user.id
        self.db.execute(update(BoxOccupancy).where(BoxOccupancy.lot_id == lot.id, BoxOccupancy.occupied_until.is_(None)).values(occupied_until=now))

    def _end_pressing(self, lot: Lot, payload: LotMoveIn, now: datetime) -> None:
        """
        End a Lot's Pressing: record its oil, hand some to the Client at once, store the rest in Tanks; with nothing stored the Lot is withdrawn.

        Args:
            lot (Lot): Pressing Lot.
            payload (LotMoveIn): Oil, handover and Tank pours.
            now (datetime): When it ended.

        Raises:
            RefusedError: oil_required, oil_split_invalid, tank_not_found, tank_full.
        """
        if payload.oil_litres is None:
            raise RefusedError("oil_required", 422)
        oil = Decimal(str(payload.oil_litres))
        handed = Decimal(0) if lot.mode == LotMode.PURCHASE else Decimal(str(payload.handed_litres if payload.handed_litres is not None else (0 if payload.pours else payload.oil_litres)))
        poured = sum((Decimal(str(pour.litres)) for pour in payload.pours), Decimal(0))
        if handed + poured != oil:
            raise RefusedError("oil_split_invalid", 422)
        self._check_tanks(lot.site_id, payload.pours)
        lot.status = LotStatus.PRESSED
        lot.oil_in_litres = oil
        lot.pressing_ended_at = now
        lot.pressing_ended_by_id = self.current_user.id
        owner = StorageOwner.MILL if lot.mode == LotMode.PURCHASE else StorageOwner.CLIENT
        self.db.add_all(
            [
                Storage(lot_id=lot.id, tank_id=pour.tank_id, owner=owner, client_id=lot.client_id if owner == StorageOwner.CLIENT else None, oil_in_litres=Decimal(str(pour.litres)), stored_from=now, planned_until=payload.planned_until, entered_at=now, created_by_id=self.current_user.id)
                for pour in payload.pours
            ]
        )
        if handed > 0:
            self._add_withdrawal(lot, WithdrawalKind.HANDOVER, handed, now)
        self._notify_pressed(lot, now)
        if not payload.pours:
            lot.status = LotStatus.WITHDRAWN

    def _withdraw_rest(self, lot: Lot, now: datetime) -> None:
        """
        Hand the Client everything still stored for the Lot, closing its Storages.

        Args:
            lot (Lot): Pressed Lot.
            now (datetime): When it was taken.
        """
        storages = list(self.db.scalars(select(Storage).where(Storage.lot_id == lot.id, Storage.ended_at.is_(None))))
        remainders = get_storage_remainders(self.db, storages)
        withdrawal = self._add_withdrawal(lot, WithdrawalKind.WITHDRAWAL, sum(remainders.values(), Decimal(0)), now)
        for storage in storages:
            if remainders[storage.id] > 0:
                self.db.add(StorageDraw(storage_id=storage.id, oil_in_litres=remainders[storage.id], reason=StorageDrawReason.WITHDRAWAL, withdrawal_id=withdrawal.id, created_by_id=self.current_user.id))
            storage.ended_at = now
        lot.status = LotStatus.WITHDRAWN

    def _add_withdrawal(self, lot: Lot, kind: WithdrawalKind, litres: Decimal, now: datetime) -> Withdrawal:
        """
        Record oil leaving the mill with the Client, as one line of the litres taken.

        Args:
            lot (Lot): Lot the oil comes from.
            kind (WithdrawalKind): Handover at the end of Pressing, or a later withdrawal.
            litres (Decimal): Litres taken.
            now (datetime): When it was taken.

        Returns:
            Withdrawal: The Withdrawal, flushed.
        """
        client = self.db.get(Client, lot.client_id)
        withdrawal = Withdrawal(
            code=give_next_code(self.db, self.db.get(Site, lot.site_id), self.db.get(Season, lot.season_id), CodeKind.WITHDRAWAL),
            site_id=lot.site_id,
            lot_id=lot.id,
            kind=kind,
            taken_by_name=client.display_name if client else "",
            taken_by_phone=client.phone if client else None,
            is_taken_by_client=True,
            entered_at=now,
            created_by_id=self.current_user.id,
        )
        self.db.add(withdrawal)
        self.db.flush()
        if litres > 0:
            self.db.add(WithdrawalLine(withdrawal_id=withdrawal.id, container_in_litres=litres, container_count=1, created_by_id=self.current_user.id))
        return withdrawal

    def _check_tanks(self, site_id: UUID, pours: list[TankPourIn]) -> None:
        """
        Refuse a pour into another Site's Tank, a retired one, or one it would overflow.

        Args:
            site_id (UUID): Site of the Lot.
            pours (list[TankPourIn]): Tank pours.

        Raises:
            RefusedError: tank_not_found, tank_full.
        """
        if not pours:
            return
        tank_ids = [pour.tank_id for pour in pours]
        tanks = {tank.id: tank for tank in self.db.scalars(select(Tank).where(Tank.id.in_(tank_ids), Tank.site_id == site_id, Tank.retired_at.is_(None)))}
        if len(tanks) != len(set(tank_ids)):
            raise RefusedError("tank_not_found", 422)
        fills = get_tank_fills(self.db, tank_ids)
        for pour in pours:
            fills[pour.tank_id] += Decimal(str(pour.litres))
            if fills[pour.tank_id] > tanks[pour.tank_id].capacity_in_litres:
                raise RefusedError("tank_full")

    def _notify_pressed(self, lot: Lot, now: datetime) -> None:
        """
        Record the message telling the Client their oil is ready; an email is kept to be sent once the transaction is committed.

        Args:
            lot (Lot): Lot just pressed.
            now (datetime): When it was pressed.
        """
        notification = build_pressed_notification(self.db, lot, now)
        if notification is None:
            return
        self.db.add(notification)
        if notification.status == NotificationStatus.QUEUED:
            self.queued_notifications.append(notification)

def get_lot_move_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user), storage: RustFSClient = Depends(get_rustfs_client)) -> LotMoveService:
    """
    Build the lot move service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.
        storage (RustFSClient): Shared RustFS client.

    Returns:
        LotMoveService: Service bound to the session, actor and storage.
    """
    return LotMoveService(db, current_user, storage)
