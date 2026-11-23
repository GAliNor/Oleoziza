from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from core.exceptions import RefusedError
from core.helpers import get_local_midnight, get_local_today
from modules.configuration.constants.configuration_constants import DEFAULT_VALUES, MAX_DISCOUNT_LIMIT_PERCENT, SETTING_KEY_BY_VALUE_KEY
from modules.configuration.models.configuration_models import SiteSetting
from modules.configuration.types.configuration_types import ConfigurationValueKey, PriceChangeOut, ValueUpdate
from modules.site.models.site_models import Season
from modules.site.types.site_types import SeasonStatus
from modules.user.models.user_models import User


VALUE_KEY_BY_SETTING_KEY = {setting_key: value_key for value_key, setting_key in SETTING_KEY_BY_VALUE_KEY.items()}


def get_price_in_force(db: Session, site_id: UUID, season: Season | None, key: ConfigurationValueKey) -> Decimal:
    """
    Read the price in force on a Site for a Season, or the default when none was set or no Season is named.

    Args:
        db (Session): Session to read with.
        site_id (UUID): Site to read.
        season (Season | None): Season of the price.
        key (ConfigurationValueKey): Price to read.

    Returns:
        Decimal: The price in force.
    """
    if season is None:
        return DEFAULT_VALUES[key]
    value = db.scalar(build_prices_in_force_query(site_id, season, key).order_by(SiteSetting.effective_from.desc(), SiteSetting.id.desc()).limit(1))
    return value if value is not None else DEFAULT_VALUES[key]


def build_prices_in_force_query(site_id: UUID, season: Season, key: ConfigurationValueKey) -> Select:
    """
    Build the query of a price's versions that already count: until now in the open Season, until its first day in a planned one, all in a closed one.

    Args:
        site_id (UUID): Site to read.
        season (Season): Season of the price.
        key (ConfigurationValueKey): Price to read.

    Returns:
        Select: The values, unordered.
    """
    query = select(SiteSetting.value).where(SiteSetting.site_id == site_id, SiteSetting.season_id == season.id, SiteSetting.key == SETTING_KEY_BY_VALUE_KEY[key])
    if season.status == SeasonStatus.OPEN:
        return query.where(SiteSetting.effective_from <= datetime.now(timezone.utc))
    if season.status == SeasonStatus.PLANNED:
        return query.where(SiteSetting.effective_from <= get_local_midnight(season.starts_on))
    return query


def add_price_version(db: Session, site_id: UUID, season: Season, update: ValueUpdate, actor_id: UUID, now: datetime) -> tuple[dict, dict]:
    """
    Add a new version of one price in a Season, in force now or from a later day of that Season.

    Args:
        db (Session): Session of the change.
        site_id (UUID): Site changed.
        season (Season): Season the price belongs to, open or planned.
        update (ValueUpdate): Price key, amount, and the day it starts (now when omitted).
        actor_id (UUID): User who changed it.
        now (datetime): Time of the change.

    Returns:
        tuple[dict, dict]: The price before and the change, as the history shows them.

    Raises:
        RefusedError: discount_limit_too_high, season_closed, date_outside_season, date_in_past.
    """
    amount = Decimal(str(update.amount))
    if update.key == ConfigurationValueKey.DISCOUNT_LIMIT and amount > MAX_DISCOUNT_LIMIT_PERCENT:
        raise RefusedError("discount_limit_too_high", 422)
    effective_from = get_effective_from(season, update.effective_on, now)
    before = {"key": update.key.value, "value": float(get_price_in_force(db, site_id, season, update.key))}
    db.add(SiteSetting(site_id=site_id, season_id=season.id, key=SETTING_KEY_BY_VALUE_KEY[update.key], value=amount, effective_from=effective_from, created_by_id=actor_id))
    return before, {"key": update.key.value, "value": float(amount), "method": None, "effectiveFrom": effective_from.isoformat()}


def get_effective_from(season: Season, effective_on: date | None, now: datetime) -> datetime:
    """
    Turn the day a price starts into its instant: now for today in the open Season, otherwise midnight in Morocco.

    An open Season still takes a price for now past its end date, since it still takes Lots.

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
    if season.status == SeasonStatus.OPEN and effective_on in (None, get_local_today()):
        return now
    day = effective_on or season.starts_on
    if day < season.starts_on or (season.ends_on is not None and day > season.ends_on):
        raise RefusedError("date_outside_season", 422)
    if season.status == SeasonStatus.OPEN and day < get_local_today():
        raise RefusedError("date_in_past", 422)
    return get_local_midnight(day)


def list_price_changes(db: Session, site_id: UUID, season: Season | None) -> list[PriceChangeOut]:
    """
    List every dated price of a Season on a Site, oldest first, with who set it and whether it is still to come.

    Args:
        db (Session): Session to read with.
        site_id (UUID): Site to read.
        season (Season | None): Season to read, none when no Season is named.

    Returns:
        list[PriceChangeOut]: The price versions.
    """
    if season is None:
        return []
    rows = db.execute(
        select(SiteSetting, User.first_name, User.last_name)
        .outerjoin(User, User.id == SiteSetting.created_by_id)
        .where(SiteSetting.site_id == site_id, SiteSetting.season_id == season.id, SiteSetting.key.in_(VALUE_KEY_BY_SETTING_KEY))
        .order_by(SiteSetting.effective_from, SiteSetting.id)
    ).all()
    now = datetime.now(timezone.utc)
    return [
        PriceChangeOut(
            id=setting.id,
            key=VALUE_KEY_BY_SETTING_KEY[setting.key],
            value=float(setting.value),
            effective_from=setting.effective_from,
            by=f"{first_name or ''} {last_name or ''}".strip(),
            is_scheduled=setting.effective_from > now,
        )
        for setting, first_name, last_name in rows
    ]
