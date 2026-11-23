from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.audit.models.audit_models import AuditEvent
from modules.configuration.business.equipment_changes import change_boxes, change_press_lines, change_tanks, get_next_number, list_boxes, list_press_lines, list_tanks, map_press_line, map_tank
from modules.configuration.business.notification_channels import build_notification_channel_views
from modules.configuration.business.price_versions import VALUE_KEY_BY_SETTING_KEY, add_price_version, get_price_in_force, list_price_changes
from modules.configuration.constants.configuration_constants import (
    CONFIGURATION_CHANGED_ACTION,
    DEFAULT_BOX_CAPACITY_IN_KG,
    HISTORY_LENGTH,
    PAYMENT_METHOD_ORDER,
    PRICE_CHANGE_CANCELLED_ACTION,
    PRICE_CHANGE_DELETED_ACTION,
)
from modules.configuration.models.configuration_models import PaymentMethodSetting, PressLine, SiteSetting, Tank
from modules.configuration.types.configuration_types import (
    ConfigurationChangeOut,
    ConfigurationOut,
    ConfigurationUpdateIn,
    ConfigurationValueKey,
    EquipmentSnapshot,
    MethodChange,
    PaymentMethodSettingOut,
)
from modules.site.business.season_lookup import get_open_season
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
            RefusedError: site_not_found, site_forbidden for staff not assigned there, season_not_found.
        """
        self._get_site(site_id)
        if not current_user.is_owner and str(site_id) not in current_user.permissions_by_site:
            raise RefusedError("site_forbidden", 403)
        return self._build_configuration(site_id, self._get_season(season_id) if season_id else get_open_season(self.db))

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
            RefusedError: site_not_found, site_forbidden, season_not_found.
        """
        season = self._get_season(season_id) if season_id else get_open_season(self.db)
        return [self._build_configuration(site_id, season) for site_id in resolve_site_ids(self.db, current_user, site_ids)]

    def get_price_in_force(self, site_id: UUID, season: Season, key: ConfigurationValueKey) -> Decimal:
        """
        Read one price in force on a Site for a Season, for the records that copy it as their suggested price.

        Args:
            site_id (UUID): Site to read.
            season (Season): Season of the record.
            key (ConfigurationValueKey): Price to read.

        Returns:
            Decimal: The price in force, or its default.
        """
        return get_price_in_force(self.db, site_id, season, key)

    def delete_price_change(self, site_id: UUID, change_id: UUID, current_user: CurrentUser) -> ConfigurationOut:
        """
        Delete a price version, so the one before it applies again: a scheduled one by who manages the Configuration, one already in force by an Owner only. Lots keep the rate copied at their Reception.

        Args:
            site_id (UUID): Site of the change.
            change_id (UUID): Price version to delete.
            current_user (CurrentUser): Signed-in User.

        Returns:
            ConfigurationOut: The Configuration of the change's Season afterwards.

        Raises:
            RefusedError: configuration_forbidden, price_change_not_found, owner_only, season_closed.
        """
        if not current_user.has_permission(site_id, Permission.CONFIGURATION_MANAGE):
            raise RefusedError("configuration_forbidden", 403)
        setting = self.db.get(SiteSetting, change_id)
        key = VALUE_KEY_BY_SETTING_KEY.get(setting.key) if setting is not None else None
        if setting is None or key is None or setting.site_id != site_id or setting.season_id is None:
            raise RefusedError("price_change_not_found", 404)
        season = self._get_season(setting.season_id)
        if season.status == SeasonStatus.CLOSED:
            raise RefusedError("season_closed")
        is_scheduled = setting.effective_from > datetime.now(timezone.utc)
        if not is_scheduled and not current_user.is_owner:
            raise RefusedError("owner_only", 403)
        before = {"key": key.value, "value": float(setting.value), "effectiveFrom": setting.effective_from.isoformat()}
        self.db.delete(setting)
        self.db.flush()
        after = {"key": key.value, "value": float(get_price_in_force(self.db, site_id, season, key))}
        action = PRICE_CHANGE_CANCELLED_ACTION if is_scheduled else PRICE_CHANGE_DELETED_ACTION
        record_audit_event(self.db, current_user.id, action, site_id=site_id, entity_type="site_setting", entity_id=change_id, before=before, after=after)
        self.db.commit()
        return self._build_configuration(site_id, season)

    def update_configuration(self, site_id: UUID, payload: ConfigurationUpdateIn, current_user: CurrentUser) -> ConfigurationOut:
        """
        Apply one change to a Site's Configuration and record it in the Audit Trail; a change already recorded is not applied twice. A price needs its Season; Payment Methods and equipment belong to no Season and are saved whatever the Seasons' state.

        Args:
            site_id (UUID): Site to change.
            payload (ConfigurationUpdateIn): One change, with the id minted by the front.
            current_user (CurrentUser): Signed-in User.

        Returns:
            ConfigurationOut: The Configuration after the change.

        Raises:
            RefusedError: configuration_forbidden, one_change_per_request, season_not_found, season_not_open, or the rule the change breaks.
        """
        self._get_site(site_id)
        if not current_user.has_permission(site_id, Permission.CONFIGURATION_MANAGE):
            raise RefusedError("configuration_forbidden", 403)
        season = self._get_season(payload.season_id) if payload.season_id else get_open_season(self.db)
        if self.db.get(AuditEvent, payload.id) is not None:
            return self._build_configuration(site_id, season)
        parts = [part for part in (payload.value, payload.method, payload.boxes, payload.tanks, payload.press_lines) if part is not None]
        if len(parts) != 1:
            raise RefusedError("one_change_per_request", 422)
        before, after = self._apply_change(site_id, season, payload, current_user)
        record_audit_event(self.db, current_user.id, CONFIGURATION_CHANGED_ACTION, site_id=site_id, entity_type="site", entity_id=site_id, before=before, after=after, event_id=payload.id)
        self.db.commit()
        return self._build_configuration(site_id, season)

    def _apply_change(self, site_id: UUID, season: Season | None, payload: ConfigurationUpdateIn, current_user: CurrentUser) -> tuple[dict, dict]:
        """
        Apply the one change a request carries, uncommitted. Equipment no Lot ever used is deleted when an Owner removes it, retired otherwise.

        Args:
            site_id (UUID): Site to change.
            season (Season | None): Season a price belongs to.
            payload (ConfigurationUpdateIn): The change.
            current_user (CurrentUser): Signed-in User.

        Returns:
            tuple[dict, dict]: The setting before and after, for the Audit Trail.

        Raises:
            RefusedError: season_not_open for a price without a Season, or the rule the change breaks.
        """
        now = datetime.now(timezone.utc)
        if payload.value is not None:
            if season is None:
                raise RefusedError("season_not_open")
            return add_price_version(self.db, site_id, season, payload.value, current_user.id, now)
        if payload.method is not None:
            return self._set_method(site_id, payload.method, current_user.id, now)
        if payload.boxes is not None:
            return change_boxes(self.db, site_id, payload.boxes, current_user.id, now, current_user.is_owner)
        if payload.tanks is not None:
            return change_tanks(self.db, site_id, payload.tanks, current_user.id, now, current_user.is_owner)
        return change_press_lines(self.db, site_id, payload.press_lines or [], current_user.id, now, current_user.is_owner)

    def _get_season(self, season_id: UUID) -> Season:
        """
        Load a Season or refuse an unknown id.

        Args:
            season_id (UUID): Season id.

        Returns:
            Season: The Season.

        Raises:
            RefusedError: season_not_found.
        """
        season = self.db.get(Season, season_id)
        if season is None:
            raise RefusedError("season_not_found", 404)
        return season

    def _set_method(self, site_id: UUID, update: PaymentMethodSettingOut, actor_id: UUID, now: datetime) -> tuple[dict, dict]:
        """
        Add a new version of one Payment Method setting, keeping at least one method on.

        Args:
            site_id (UUID): Site changed.
            update (PaymentMethodSettingOut): Method, on or off, proof required or not.
            actor_id (UUID): User who changed it.
            now (datetime): Time of the change.

        Returns:
            tuple[dict, dict]: The method before and after, as the history shows them.

        Raises:
            RefusedError: last_method when it would switch off the last method on.
        """
        methods = self._get_methods(site_id)
        is_last_enabled = [method.key for method in methods if method.is_enabled] == [update.key]
        if is_last_enabled and not update.is_enabled:
            raise RefusedError("last_method")
        previous = next(method for method in methods if method.key == update.key)
        self.db.add(PaymentMethodSetting(site_id=site_id, method=update.key, is_enabled=update.is_enabled, is_proof_required=update.needs_proof, effective_from=now, created_by_id=actor_id))
        before = {"key": update.key.value, "method": {"isEnabled": previous.is_enabled, "needsProof": previous.needs_proof}}
        return before, {"key": update.key.value, "value": None, "method": {"isEnabled": update.is_enabled, "needsProof": update.needs_proof}}

    def _build_configuration(self, site_id: UUID, season: Season | None) -> ConfigurationOut:
        """
        Gather everything the Configuration page shows for a Site; without a Season, the settings that belong to none and the default prices.

        Args:
            site_id (UUID): Site to read.
            season (Season | None): Season whose prices are read.

        Returns:
            ConfigurationOut: The Configuration.
        """
        boxes = list_boxes(self.db, site_id)
        return ConfigurationOut(
            site_id=site_id,
            season_id=season.id if season else None,
            season_label=season.label if season else None,
            season_status=season.status.value if season else None,
            price_changes=list_price_changes(self.db, site_id, season),
            milling_rate=float(get_price_in_force(self.db, site_id, season, ConfigurationValueKey.MILLING_RATE)),
            discount_limit=float(get_price_in_force(self.db, site_id, season, ConfigurationValueKey.DISCOUNT_LIMIT)),
            oil_price=float(get_price_in_force(self.db, site_id, season, ConfigurationValueKey.OIL_PRICE)),
            methods=self._get_methods(site_id),
            box_count=len(boxes),
            box_capacity_kg=float(boxes[0].capacity_in_kg if boxes else DEFAULT_BOX_CAPACITY_IN_KG),
            tanks=[map_tank(tank) for tank in list_tanks(self.db, site_id)],
            press_lines=[map_press_line(line) for line in list_press_lines(self.db, site_id)],
            next_tank_number=get_next_number(self.db, Tank, site_id),
            next_press_line_number=get_next_number(self.db, PressLine, site_id),
            history=self._get_history(site_id),
            notification_channels=build_notification_channel_views(self.db),
        )

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


def get_configuration_service(db: Session = Depends(get_db)) -> ConfigurationService:
    """
    Build the configuration service for one request.

    Args:
        db (Session): Request-scoped database session.

    Returns:
        ConfigurationService: Service bound to the session.
    """
    return ConfigurationService(db)
