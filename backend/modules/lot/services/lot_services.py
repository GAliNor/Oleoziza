from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.integrations.rustfs.rustfs_client import RustFSClient, get_rustfs_client
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.client.models.client_models import Client
from modules.configuration.models.configuration_models import Box, OliveVariety, PressLine
from modules.configuration.services.configuration_services import ConfigurationService
from modules.configuration.types.configuration_types import ConfigurationValueKey
from modules.finance.business.client_credit import use_open_credit
from modules.lot.business.box_capacity import check_box_capacity
from modules.lot.business.lot_photos import build_photo_urls, keep_lot_photo
from modules.lot.business.lot_views import build_lot_views
from modules.lot.models.lot_models import BoxOccupancy, Lot
from modules.lot.types.lot_types import LotMode, LotOut, LotPhotoStep, LotReceiveIn, LotStatus
from modules.site.business.code_sequences import give_next_code
from modules.site.business.season_lookup import get_open_season
from modules.site.business.site_scope import resolve_site_ids
from modules.site.models.site_models import Season, Site
from modules.site.types.site_types import CodeKind
from modules.user.types.user_types import Permission


LOT_RECEIVED_ACTION = "lot.received"


class LotService:
    def __init__(self, db: Session, current_user: CurrentUser, storage: RustFSClient | None = None) -> None:
        """
        Keep the session, the User reading or moving Lots, and the storage of their photos.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
            storage (RustFSClient | None): RustFS client, the shared one when omitted.
        """
        self.db = db
        self.current_user = current_user
        self.storage = storage or get_rustfs_client()

    def list_lots(self, site_ids: list[UUID], season_id: UUID | None) -> list[LotOut]:
        """
        List the Lots of one Season (the open one by default) on the Sites asked for, newest first, shaped in a fixed number of queries.

        Args:
            site_ids (list[UUID]): Sites to read, every Site held when none.
            season_id (UUID | None): Season to read.

        Returns:
            list[LotOut]: The Lots.

        Raises:
            RefusedError: site_not_found, site_forbidden, season_not_open.
        """
        scoped_site_ids = resolve_site_ids(self.db, self.current_user, site_ids)
        season = self.db.get(Season, season_id) if season_id else get_open_season(self.db)
        if season is None:
            return []
        lots = self.db.scalars(select(Lot).where(Lot.site_id.in_(scoped_site_ids), Lot.season_id == season.id).order_by(Lot.entered_at.desc())).all()
        return build_lot_views(self.db, list(lots))

    def get_lot(self, lot_id: UUID) -> LotOut:
        """
        Read one Lot.

        Args:
            lot_id (UUID): Lot to read.

        Returns:
            LotOut: The Lot.

        Raises:
            RefusedError: lot_not_found, site_forbidden.
        """
        return build_lot_views(self.db, [self.get_lot_row(lot_id)])[0]

    def receive_lot(self, payload: LotReceiveIn) -> LotOut:
        """
        Turn one Reception into a waiting Lot in the Boxes it fills, on a Press Line's queue or with its Press Line left for later, with its photo; a replay of the same id answers the Lot already saved.

        Args:
            payload (LotReceiveIn): The Reception as typed.

        Returns:
            LotOut: The Lot as saved.

        Raises:
            RefusedError: lots_forbidden, season_not_open, client_not_found, variety_not_found, line_incomplete, press_line_not_found, box_not_found, box_taken, box_capacity_short.
        """
        existing = self.db.get(Lot, payload.id)
        if existing is not None:
            return build_lot_views(self.db, [existing])[0]
        if not self.current_user.has_permission(payload.site_id, Permission.RECEPTION_CREATE):
            raise RefusedError("lots_forbidden", 403)
        site = self.db.get(Site, payload.site_id)
        season = get_open_season(self.db)
        if site is None or season is None:
            raise RefusedError("season_not_open")
        if self.db.get(Client, payload.client_id) is None:
            raise RefusedError("client_not_found", 404)
        variety_id = self._resolve_variety(payload.variety)
        if (payload.press_line_id is None) != (payload.planned_start_at is None):
            raise RefusedError("line_incomplete", 422)
        if payload.press_line_id is not None:
            self._check_press_line(payload.site_id, payload.press_line_id)
        boxes = self._take_boxes(payload.site_id, payload.box_numbers)
        if not payload.are_boxes_ignored:
            check_box_capacity(boxes, Decimal(str(payload.net_kg)))
        entered_at = payload.entered_at or datetime.now(timezone.utc)
        suggested_rate = ConfigurationService(self.db).get_price_in_force(payload.site_id, season, ConfigurationValueKey.MILLING_RATE) if payload.mode == LotMode.SERVICE_MILLING else None
        lot = Lot(
            id=payload.id,
            code=give_next_code(self.db, site, season, CodeKind.LOT),
            site_id=payload.site_id,
            season_id=season.id,
            client_id=payload.client_id,
            mode=payload.mode,
            olive_variety_id=variety_id,
            net_weight_in_kg=Decimal(str(payload.net_kg)),
            suggested_milling_rate_per_kg=suggested_rate,
            milling_rate_per_kg=Decimal(str(payload.milling_rate_per_kg)) if payload.mode == LotMode.SERVICE_MILLING else None,
            notification_choice=payload.notification_choice,
            press_line_id=payload.press_line_id,
            planned_start_at=payload.planned_start_at,
            entered_at=entered_at,
            was_recorded_offline=payload.recorded_offline,
            device_label=payload.device_label,
            created_by_id=self.current_user.id,
        )
        self.db.add(lot)
        self.db.flush()
        if payload.photo_url:
            keep_lot_photo(self.db, self.storage, lot.id, LotPhotoStep.RECEPTION, payload.photo_url, self.current_user.id, entered_at, payload.recorded_offline)
        self.db.add_all([BoxOccupancy(lot_id=lot.id, box_id=box.id, occupied_from=entered_at, created_by_id=self.current_user.id) for box in boxes])
        if lot.mode == LotMode.SERVICE_MILLING:
            use_open_credit(self.db, lot.client_id, lot.site_id, lot.id, lot.net_weight_in_kg * (lot.milling_rate_per_kg or Decimal(0)), self.current_user.id)
        record_audit_event(self.db, self.current_user.id, LOT_RECEIVED_ACTION, site_id=lot.site_id, entity_type="lot", entity_id=lot.id, after={"code": lot.code, "netKg": payload.net_kg, "boxes": payload.box_numbers, "boxesIgnored": payload.are_boxes_ignored})
        self.db.commit()
        return build_lot_views(self.db, [lot])[0]

    def page_lots_without_line(self, site_ids: list[UUID], offset: int, limit: int) -> tuple[list[LotOut], int]:
        """
        Read one page of the open Season's waiting Lots that have no Press Line yet, the oldest first.

        Args:
            site_ids (list[UUID]): Sites to read, every Site held when none.
            offset (int): First row.
            limit (int): Rows per page.

        Returns:
            tuple[list[LotOut], int]: The page and how many there are.

        Raises:
            RefusedError: site_not_found, site_forbidden.
        """
        scoped_site_ids = resolve_site_ids(self.db, self.current_user, site_ids)
        season = get_open_season(self.db)
        if season is None:
            return [], 0
        query = select(Lot).where(Lot.site_id.in_(scoped_site_ids), Lot.season_id == season.id, Lot.status == LotStatus.WAITING, Lot.press_line_id.is_(None))
        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        lots = list(self.db.scalars(query.order_by(Lot.entered_at, Lot.id).offset(offset).limit(limit)))
        return build_lot_views(self.db, lots), total

    def list_photos(self, lot_id: UUID) -> dict[LotPhotoStep, str]:
        """
        Sign the URLs of a Lot's photos, read when its timeline opens.

        Args:
            lot_id (UUID): Lot.

        Returns:
            dict[LotPhotoStep, str]: URLs by step.

        Raises:
            RefusedError: lot_not_found, site_forbidden.
        """
        return build_photo_urls(self.db, self.storage, self.get_lot_row(lot_id).id)

    def get_lot_row(self, lot_id: UUID) -> Lot:
        """
        Load a Lot the caller may see.

        Args:
            lot_id (UUID): Lot id.

        Returns:
            Lot: The Lot.

        Raises:
            RefusedError: lot_not_found, site_forbidden.
        """
        lot = self.db.get(Lot, lot_id)
        if lot is None:
            raise RefusedError("lot_not_found", 404)
        resolve_site_ids(self.db, self.current_user, [lot.site_id])
        return lot

    def _resolve_variety(self, variety: str) -> str:
        """
        Find an olive variety by its slug or its name.

        Args:
            variety (str): Slug or name.

        Returns:
            str: The variety's slug.

        Raises:
            RefusedError: variety_not_found.
        """
        variety_id = self.db.scalar(select(OliveVariety.id).where(or_(OliveVariety.id == variety, OliveVariety.name == variety)))
        if variety_id is None:
            raise RefusedError("variety_not_found", 422)
        return variety_id

    def _check_press_line(self, site_id: UUID, press_line_id: UUID) -> None:
        """
        Refuse a Press Line of another Site, or one retired.

        Args:
            site_id (UUID): Site of the Lot.
            press_line_id (UUID): Press Line chosen.

        Raises:
            RefusedError: press_line_not_found.
        """
        press_line = self.db.get(PressLine, press_line_id)
        if press_line is None or press_line.site_id != site_id or press_line.retired_at is not None:
            raise RefusedError("press_line_not_found", 422)

    def _take_boxes(self, site_id: UUID, numbers: list[int]) -> list[Box]:
        """
        Find the Boxes a Reception fills and refuse one already holding a Lot.

        Args:
            site_id (UUID): Site of the Lot.
            numbers (list[int]): Box numbers.

        Returns:
            list[Box]: The Boxes.

        Raises:
            RefusedError: box_not_found, box_taken.
        """
        if not numbers:
            return []
        boxes = self.db.scalars(select(Box).where(Box.site_id == site_id, Box.number.in_(numbers), Box.retired_at.is_(None))).all()
        if len(boxes) != len(set(numbers)):
            raise RefusedError("box_not_found", 422)
        if self.db.scalar(select(BoxOccupancy.id).where(BoxOccupancy.box_id.in_([box.id for box in boxes]), BoxOccupancy.occupied_until.is_(None)).limit(1)):
            raise RefusedError("box_taken")
        return list(boxes)


def get_lot_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user), storage: RustFSClient = Depends(get_rustfs_client)) -> LotService:
    """
    Build the lot service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.
        storage (RustFSClient): Shared RustFS client.

    Returns:
        LotService: Service bound to the session, actor and storage.
    """
    return LotService(db, current_user, storage)
