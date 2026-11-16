from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.helpers import get_local_midnight, get_local_today
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.audit.models.audit_models import AuditEvent
from modules.configuration.constants.configuration_constants import (
    CONFIGURATION_CHANGED_ACTION,
    DEFAULT_BOX_CAPACITY_IN_KG,
    DEFAULT_VALUES,
    HISTORY_LENGTH,
    MAX_DISCOUNT_LIMIT_PERCENT,
    PAYMENT_METHOD_ORDER,
    SETTING_KEY_BY_VALUE_KEY,
)
from modules.configuration.models.configuration_models import Box, PaymentMethodSetting, PressLine, SiteSetting, Tank
from modules.configuration.types.configuration_types import (
    BoxesUpdate,
    ConfigurationChangeOut,
    ConfigurationOut,
    ConfigurationUpdateIn,
    ConfigurationValueKey,
    EquipmentSnapshot,
    MethodChange,
    PaymentMethodSettingOut,
    PressLineSettingOut,
    PriceChangeOut,
    TankSettingOut,
    ValueUpdate,
)
from modules.lot.models.lot_models import BoxOccupancy, Lot
from modules.lot.types.lot_types import LotStatus
from modules.oil.models.oil_models import Storage
from modules.site.business.site_scope import resolve_site_ids
from modules.site.models.site_models import Season, Site
from modules.site.types.site_types import SeasonStatus
from modules.user.models.user_models import User
from modules.user.types.user_types import Permission


class ConfigurationService:
    def __init__(self, db: Session) -> None:
        """
        Keep the session used to read and change a Site's Configuration.

        Args:
            db (Session): Request-scoped database session.
        """
        self.db = db

    def get_configuration(self, site_id: UUID, current_user: CurrentUser, season_id: UUID | None = None) -> ConfigurationOut:
        """
        Read a Site's prices for one Season (the open one by default) with their dated changes, its Payment Methods, its equipment and the history of its changes.

        Args:
            site_id (UUID): Site to read.
            current_user (CurrentUser): Signed-in User.
            season_id (UUID | None): Season to read, the open one when omitted.

        Returns:
            ConfigurationOut: The Configuration as the front shows it.

        Raises:
            RefusedError: site_not_found, site_forbidden for staff not assigned there, season_not_found, season_not_open.
        """
        self._get_site(site_id)
        if not current_user.is_owner and str(site_id) not in current_user.permissions_by_site:
            raise RefusedError("site_forbidden", 403)
        return self._build_configuration(site_id, self._resolve_season(season_id))

    def list_configurations(self, site_ids: list[UUID], current_user: CurrentUser, season_id: UUID | None = None) -> list[ConfigurationOut]:
        """
        Read several Sites' Configurations for one Season in one call, every Site the caller holds when none is named.

        Args:
            site_ids (list[UUID]): Sites to read, possibly none.
            current_user (CurrentUser): Signed-in User.
            season_id (UUID | None): Season to read, the open one when omitted.

        Returns:
            list[ConfigurationOut]: One Configuration per Site.

        Raises:
            RefusedError: site_not_found, site_forbidden, season_not_found, season_not_open.
        """
        season = self._resolve_season(season_id)
        return [self._build_configuration(site_id, season) for site_id in resolve_site_ids(self.db, current_user, site_ids)]

    def cancel_price_change(self, site_id: UUID, change_id: UUID, current_user: CurrentUser) -> ConfigurationOut:
        """
        Cancel a scheduled price change before it takes effect.

        Args:
            site_id (UUID): Site of the change.
            change_id (UUID): Scheduled price version to cancel.
            current_user (CurrentUser): Signed-in User.

        Returns:
            ConfigurationOut: The Configuration of the change's Season after cancelling.

        Raises:
            RefusedError: configuration_forbidden, price_change_not_found, change_in_force.
        """
        if not current_user.has_permission(site_id, Permission.CONFIGURATION_MANAGE):
            raise RefusedError("configuration_forbidden", 403)
        setting = self.db.get(SiteSetting, change_id)
        if setting is None or setting.site_id != site_id or setting.season_id is None:
            raise RefusedError("price_change_not_found", 404)
        if setting.effective_from <= datetime.now(timezone.utc):
            raise RefusedError("change_in_force")
        season = self.db.get(Season, setting.season_id)
        record_audit_event(self.db, current_user.id, "configuration.price_change_cancelled", site_id=site_id, entity_type="site_setting", entity_id=setting.id, before={"key": setting.key.value, "value": float(setting.value), "effectiveFrom": setting.effective_from.isoformat()})
        self.db.delete(setting)
        self.db.commit()
        return self._build_configuration(site_id, season)

    def update_configuration(self, site_id: UUID, payload: ConfigurationUpdateIn, current_user: CurrentUser) -> ConfigurationOut:
        """
        Apply one change to a Site's Configuration and record it in the Audit Trail; a change already recorded is not applied twice.

        Args:
            site_id (UUID): Site to change.
            payload (ConfigurationUpdateIn): One change, with the id minted by the front.
            current_user (CurrentUser): Signed-in User.

        Returns:
            ConfigurationOut: The Configuration after the change.

        Raises:
            RefusedError: configuration_forbidden, one_change_per_request, season_not_open, or the rule the change breaks.
        """
        self._get_site(site_id)
        if not current_user.has_permission(site_id, Permission.CONFIGURATION_MANAGE):
            raise RefusedError("configuration_forbidden", 403)
        season = self._resolve_season(payload.season_id)
        if self.db.get(AuditEvent, payload.id) is not None:
            return self._build_configuration(site_id, season)
        parts = [part for part in (payload.value, payload.method, payload.boxes, payload.tanks, payload.press_lines) if part is not None]
        if len(parts) != 1:
            raise RefusedError("one_change_per_request", 422)
        now = datetime.now(timezone.utc)
        if payload.value is not None:
            change = self._set_value(site_id, season, payload.value, current_user.id, now)
        elif payload.method is not None:
            change = self._set_method(site_id, payload.method, current_user.id, now)
        elif payload.boxes is not None:
            change = self._set_boxes(site_id, payload.boxes, current_user.id, now)
        elif payload.tanks is not None:
            change = self._set_tanks(site_id, payload.tanks, current_user.id, now)
        else:
            change = self._set_press_lines(site_id, payload.press_lines or [], current_user.id, now)
        record_audit_event(self.db, current_user.id, CONFIGURATION_CHANGED_ACTION, site_id=site_id, entity_type="site", entity_id=site_id, after=change, event_id=payload.id)
        self.db.commit()
        return self._build_configuration(site_id, season)

    def _get_site(self, site_id: UUID) -> Site:
        """
        Load a Site or refuse an unknown id.

        Args:
            site_id (UUID): Site id.

        Returns:
            Site: The Site.

        Raises:
            RefusedError: site_not_found.
        """
        site = self.db.get(Site, site_id)
        if site is None:
            raise RefusedError("site_not_found", 404)
        return site

    def _resolve_season(self, season_id: UUID | None) -> Season:
        """
        Load the Season asked for, or the open one when none is named.

        Args:
            season_id (UUID | None): Season id, or None for the open Season.

        Returns:
            Season: The Season.

        Raises:
            RefusedError: season_not_found, season_not_open.
        """
        if season_id is None:
            return self._get_open_season()
        season = self.db.get(Season, season_id)
        if season is None:
            raise RefusedError("season_not_found", 404)
        return season

    def _get_open_season(self) -> Season:
        """
        Load the Season under way, the one prices belong to.

        Returns:
            Season: The open Season.

        Raises:
            RefusedError: season_not_open when no Season is open.
        """
        season = self.db.scalar(select(Season).where(Season.status == SeasonStatus.OPEN))
        if season is None:
            raise RefusedError("season_not_open")
        return season

    def _set_value(self, site_id: UUID, season: Season, update: ValueUpdate, actor_id: UUID, now: datetime) -> dict:
        """
        Add a new version of one price in a Season, in force now or from a later day of that Season.

        Args:
            site_id (UUID): Site changed.
            season (Season): Season the price belongs to, open or planned.
            update (ValueUpdate): Price key, amount, and the day it starts (now when omitted).
            actor_id (UUID): User who changed it.
            now (datetime): Time of the change.

        Returns:
            dict: The change as the history shows it.

        Raises:
            RefusedError: discount_limit_too_high, season_closed, date_outside_season, date_in_past.
        """
        amount = Decimal(str(update.amount))
        if update.key == ConfigurationValueKey.DISCOUNT_LIMIT and amount > MAX_DISCOUNT_LIMIT_PERCENT:
            raise RefusedError("discount_limit_too_high", 422)
        effective_from = self._get_effective_from(season, update.effective_on, now)
        self.db.add(SiteSetting(site_id=site_id, season_id=season.id, key=SETTING_KEY_BY_VALUE_KEY[update.key], value=amount, effective_from=effective_from, created_by_id=actor_id))
        return {"key": update.key.value, "value": float(amount), "method": None, "effectiveFrom": effective_from.isoformat()}

    def _get_effective_from(self, season: Season, effective_on: date | None, now: datetime) -> datetime:
        """
        Turn the day a price starts into its instant: now for today in the open Season, otherwise midnight in Morocco.

        Args:
            season (Season): Season of the price.
            effective_on (date | None): Day chosen, None for now (open Season) or the first day (planned Season).
            now (datetime): Time of the change.

        Returns:
            datetime: When the price takes effect.

        Raises:
            RefusedError: season_closed, date_outside_season, date_in_past.
        """
        if season.status == SeasonStatus.CLOSED:
            raise RefusedError("season_closed")
        day = effective_on or (get_local_today() if season.status == SeasonStatus.OPEN else season.starts_on)
        if day < season.starts_on or (season.ends_on is not None and day > season.ends_on):
            raise RefusedError("date_outside_season", 422)
        if season.status == SeasonStatus.OPEN:
            today = get_local_today()
            if day < today:
                raise RefusedError("date_in_past", 422)
            if day == today:
                return now
        return get_local_midnight(day)

    def _set_method(self, site_id: UUID, update: PaymentMethodSettingOut, actor_id: UUID, now: datetime) -> dict:
        """
        Add a new version of one Payment Method setting, keeping at least one method on.

        Args:
            site_id (UUID): Site changed.
            update (PaymentMethodSettingOut): Method, on or off, proof required or not.
            actor_id (UUID): User who changed it.
            now (datetime): Time of the change.

        Returns:
            dict: The change as the history shows it.

        Raises:
            RefusedError: last_method when it would switch off the last method on.
        """
        methods = self._get_methods(site_id)
        is_last_enabled = [method.key for method in methods if method.is_enabled] == [update.key]
        if is_last_enabled and not update.is_enabled:
            raise RefusedError("last_method")
        self.db.add(PaymentMethodSetting(site_id=site_id, method=update.key, is_enabled=update.is_enabled, is_proof_required=update.needs_proof, effective_from=now, created_by_id=actor_id))
        return {"key": update.key.value, "value": None, "method": {"isEnabled": update.is_enabled, "needsProof": update.needs_proof}}

    def _set_boxes(self, site_id: UUID, update: BoxesUpdate, actor_id: UUID, now: datetime) -> dict:
        """
        Set how many Boxes a Site has and their capacity: Boxes past the count are retired, missing ones added or brought back.

        Args:
            site_id (UUID): Site changed.
            update (BoxesUpdate): Box count and capacity.
            actor_id (UUID): User who changed it.
            now (datetime): Time of the change.

        Returns:
            dict: The change as the history shows it.

        Raises:
            RefusedError: box_in_use when a Box to retire still holds a Lot.
        """
        boxes = {box.number: box for box in self.db.scalars(select(Box).where(Box.site_id == site_id))}
        retiring_ids = [box.id for number, box in boxes.items() if number > update.count and box.retired_at is None]
        if retiring_ids and self.db.scalar(select(BoxOccupancy.id).where(BoxOccupancy.box_id.in_(retiring_ids), BoxOccupancy.occupied_until.is_(None)).limit(1)):
            raise RefusedError("box_in_use")
        capacity = Decimal(str(update.capacity_kg))
        for number in range(1, update.count + 1):
            box = boxes.get(number) or Box(site_id=site_id, number=number, created_by_id=actor_id)
            box.capacity_in_kg = capacity
            box.retired_at = None
            box.updated_by_id = actor_id
            self.db.add(box)
        for number, box in boxes.items():
            if number > update.count and box.retired_at is None:
                box.retired_at = now
                box.updated_by_id = actor_id
        return {"key": "boxes", "value": None, "method": None, "equipment": {"boxCount": update.count, "boxCapacityKg": update.capacity_kg}}

    def _set_tanks(self, site_id: UUID, tanks: list[TankSettingOut], actor_id: UUID, now: datetime) -> dict:
        """
        Replace a Site's list of Tanks: missing ones are retired if empty, new ones added, kept ones resized.

        Args:
            site_id (UUID): Site changed.
            tanks (list[TankSettingOut]): The Tanks the Site keeps.
            actor_id (UUID): User who changed it.
            now (datetime): Time of the change.

        Returns:
            dict: The change as the history shows it.

        Raises:
            RefusedError: tank_in_use when a Tank to retire still holds oil; number_taken when a number was already used.
        """
        existing = {tank.id: tank for tank in self.db.scalars(select(Tank).where(Tank.site_id == site_id))}
        kept_ids = {tank.id for tank in tanks}
        retiring_ids = [tank_id for tank_id, tank in existing.items() if tank_id not in kept_ids and tank.retired_at is None]
        if retiring_ids and self.db.scalar(select(Storage.id).where(Storage.tank_id.in_(retiring_ids), Storage.ended_at.is_(None)).limit(1)):
            raise RefusedError("tank_in_use")
        self._check_numbers_free([(tank.id, tank.number) for tank in tanks], {tank.id: tank.number for tank in existing.values()})
        for tank_setting in tanks:
            tank = existing.get(tank_setting.id) or Tank(id=tank_setting.id, site_id=site_id, created_by_id=actor_id)
            tank.number = tank_setting.number
            tank.capacity_in_litres = Decimal(str(tank_setting.capacity_litres))
            tank.updated_by_id = actor_id
            self.db.add(tank)
        for tank_id in retiring_ids:
            existing[tank_id].retired_at = now
            existing[tank_id].updated_by_id = actor_id
        return {"key": "tanks", "value": None, "method": None, "equipment": {"tanks": [tank.model_dump(mode="json", by_alias=True) for tank in tanks]}}

    def _set_press_lines(self, site_id: UUID, press_lines: list[PressLineSettingOut], actor_id: UUID, now: datetime) -> dict:
        """
        Replace a Site's list of Press Lines: missing ones are retired if no Lot waits or presses on them, new ones added, kept ones renamed.

        Args:
            site_id (UUID): Site changed.
            press_lines (list[PressLineSettingOut]): The Press Lines the Site keeps.
            actor_id (UUID): User who changed it.
            now (datetime): Time of the change.

        Returns:
            dict: The change as the history shows it.

        Raises:
            RefusedError: line_in_use when a Lot is planned or pressing on a line to retire; number_taken when a number was already used.
        """
        existing = {line.id: line for line in self.db.scalars(select(PressLine).where(PressLine.site_id == site_id))}
        kept_ids = {line.id for line in press_lines}
        retiring_ids = [line_id for line_id, line in existing.items() if line_id not in kept_ids and line.retired_at is None]
        busy_statuses = (LotStatus.WAITING, LotStatus.PRESSING)
        if retiring_ids and self.db.scalar(select(Lot.id).where(Lot.press_line_id.in_(retiring_ids), Lot.status.in_(busy_statuses)).limit(1)):
            raise RefusedError("line_in_use")
        self._check_numbers_free([(line.id, line.number) for line in press_lines], {line.id: line.number for line in existing.values()})
        for line_setting in press_lines:
            line = existing.get(line_setting.id) or PressLine(id=line_setting.id, site_id=site_id, created_by_id=actor_id)
            line.number = line_setting.number
            line.name = line_setting.name.strip() or None
            line.updated_by_id = actor_id
            self.db.add(line)
        for line_id in retiring_ids:
            existing[line_id].retired_at = now
            existing[line_id].updated_by_id = actor_id
        return {"key": "pressLines", "value": None, "method": None, "equipment": {"pressLines": [line.model_dump(mode="json", by_alias=True) for line in press_lines]}}

    def _check_numbers_free(self, wanted: list[tuple[UUID, int]], existing_numbers: dict[UUID, int]) -> None:
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

    def _get_value(self, site_id: UUID, season: Season, key: ConfigurationValueKey) -> Decimal:
        """
        Read the price in force for the open Season, or the default when none was set yet.

        Args:
            site_id (UUID): Site to read.
            season (Season): Open Season.
            key (ConfigurationValueKey): Price to read.

        Returns:
            Decimal: The price in force.
        """
        query = select(SiteSetting.value).where(SiteSetting.site_id == site_id, SiteSetting.season_id == season.id, SiteSetting.key == SETTING_KEY_BY_VALUE_KEY[key])
        if season.status == SeasonStatus.OPEN:
            query = query.where(SiteSetting.effective_from <= datetime.now(timezone.utc))
        elif season.status == SeasonStatus.PLANNED:
            query = query.where(SiteSetting.effective_from <= get_local_midnight(season.starts_on))
        value = self.db.scalar(query.order_by(SiteSetting.effective_from.desc()).limit(1))
        return value if value is not None else DEFAULT_VALUES[key]

    def _get_price_changes(self, site_id: UUID, season: Season) -> list[PriceChangeOut]:
        """
        List every dated price of a Season on a Site, oldest first, with who set it and whether it is still to come.

        Args:
            site_id (UUID): Site to read.
            season (Season): Season to read.

        Returns:
            list[PriceChangeOut]: The price versions, for the agenda.
        """
        value_key_by_setting_key = {setting_key: value_key for value_key, setting_key in SETTING_KEY_BY_VALUE_KEY.items()}
        rows = self.db.execute(
            select(SiteSetting, User.first_name, User.last_name)
            .outerjoin(User, User.id == SiteSetting.created_by_id)
            .where(SiteSetting.site_id == site_id, SiteSetting.season_id == season.id, SiteSetting.key.in_(value_key_by_setting_key))
            .order_by(SiteSetting.effective_from)
        ).all()
        now = datetime.now(timezone.utc)
        return [
            PriceChangeOut(
                id=setting.id,
                key=value_key_by_setting_key[setting.key],
                value=float(setting.value),
                effective_from=setting.effective_from,
                by=f"{first_name or ''} {last_name or ''}".strip(),
                is_scheduled=setting.effective_from > now,
            )
            for setting, first_name, last_name in rows
        ]

    def _get_methods(self, site_id: UUID) -> list[PaymentMethodSettingOut]:
        """
        Read the setting in force of each of the four Payment Methods, on and without proof by default.

        Args:
            site_id (UUID): Site to read.

        Returns:
            list[PaymentMethodSettingOut]: One setting per method, in a fixed order.
        """
        settings: list[PaymentMethodSettingOut] = []
        for method in PAYMENT_METHOD_ORDER:
            latest = self.db.scalar(
                select(PaymentMethodSetting)
                .where(PaymentMethodSetting.site_id == site_id, PaymentMethodSetting.method == method, PaymentMethodSetting.effective_from <= datetime.now(timezone.utc))
                .order_by(PaymentMethodSetting.effective_from.desc())
                .limit(1)
            )
            settings.append(PaymentMethodSettingOut(key=method, is_enabled=latest.is_enabled if latest else True, needs_proof=latest.is_proof_required if latest else False))
        return settings

    def _get_history(self, site_id: UUID) -> list[ConfigurationChangeOut]:
        """
        Read the latest Configuration changes of a Site from the Audit Trail, newest first, with who made them.

        Args:
            site_id (UUID): Site to read.

        Returns:
            list[ConfigurationChangeOut]: The changes as the history shows them.
        """
        rows = self.db.execute(
            select(AuditEvent, User.first_name, User.last_name)
            .outerjoin(User, User.id == AuditEvent.actor_id)
            .where(AuditEvent.site_id == site_id, AuditEvent.action == CONFIGURATION_CHANGED_ACTION)
            .order_by(AuditEvent.occurred_at.desc())
            .limit(HISTORY_LENGTH)
        ).all()
        history: list[ConfigurationChangeOut] = []
        for event, first_name, last_name in rows:
            change = event.after or {}
            method = change.get("method")
            equipment = change.get("equipment")
            history.append(
                ConfigurationChangeOut(
                    id=event.id,
                    key=change.get("key", ""),
                    value=change.get("value"),
                    method=MethodChange.model_validate(method) if method else None,
                    equipment=EquipmentSnapshot.model_validate(equipment) if equipment else None,
                    by=f"{first_name or ''} {last_name or ''}".strip(),
                    at=event.occurred_at,
                )
            )
        return history

    def _build_configuration(self, site_id: UUID, season: Season) -> ConfigurationOut:
        """
        Gather everything the Configuration page shows for a Site.

        Args:
            site_id (UUID): Site to read.
            season (Season): Open Season.

        Returns:
            ConfigurationOut: The Configuration.
        """
        boxes = self.db.scalars(select(Box).where(Box.site_id == site_id, Box.retired_at.is_(None)).order_by(Box.number)).all()
        tanks = self.db.scalars(select(Tank).where(Tank.site_id == site_id, Tank.retired_at.is_(None)).order_by(Tank.number)).all()
        press_lines = self.db.scalars(select(PressLine).where(PressLine.site_id == site_id, PressLine.retired_at.is_(None)).order_by(PressLine.number)).all()
        return ConfigurationOut(
            site_id=site_id,
            season_id=season.id,
            season_label=season.label,
            season_status=season.status.value,
            price_changes=self._get_price_changes(site_id, season),
            milling_rate=float(self._get_value(site_id, season, ConfigurationValueKey.MILLING_RATE)),
            discount_limit=float(self._get_value(site_id, season, ConfigurationValueKey.DISCOUNT_LIMIT)),
            oil_price=float(self._get_value(site_id, season, ConfigurationValueKey.OIL_PRICE)),
            methods=self._get_methods(site_id),
            box_count=len(boxes),
            box_capacity_kg=float(boxes[0].capacity_in_kg if boxes else DEFAULT_BOX_CAPACITY_IN_KG),
            tanks=[TankSettingOut(id=tank.id, number=tank.number, capacity_litres=float(tank.capacity_in_litres)) for tank in tanks],
            press_lines=[PressLineSettingOut(id=line.id, number=line.number, name=line.name or "") for line in press_lines],
            history=self._get_history(site_id),
        )


def get_configuration_service(db: Session = Depends(get_db)) -> ConfigurationService:
    """
    Build the configuration service for one request.

    Args:
        db (Session): Request-scoped database session.

    Returns:
        ConfigurationService: Service bound to the session.
    """
    return ConfigurationService(db)
