from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.helpers import APP_TIME_ZONE, get_local_today

from modules.site.models.site_models import Season
from modules.site.types.site_types import SeasonStatus


def get_open_season(db: Session) -> Season | None:
    """
    Find the Season under way, if any.

    Args:
        db (Session): Session to read with.

    Returns:
        Season | None: The open Season.
    """
    return db.scalar(select(Season).where(Season.status == SeasonStatus.OPEN))


def list_started_seasons(db: Session) -> list[Season]:
    """
    List the Seasons that started, open or closed, latest first; the open one leads when two start the same day.

    Args:
        db (Session): Session to read with.

    Returns:
        list[Season]: Started Seasons.
    """
    return list(db.scalars(select(Season).where(Season.status != SeasonStatus.PLANNED).order_by(Season.starts_on.desc(), Season.status != SeasonStatus.OPEN, Season.created_at.desc())))


def get_season_of_day(db: Session, day: date) -> Season | None:
    """
    Find the Season a day counts in: the last one started by then, which keeps counting until the next one starts. A day before every Season counts in the earliest one, or in the prepared one when none has started.

    Args:
        db (Session): Session to read with.
        day (date): Day to place.

    Returns:
        Season | None: The Season, None only while the app has no Season at all.
    """
    started = list_started_seasons(db)
    if not started:
        return db.scalar(select(Season).where(Season.status == SeasonStatus.PLANNED))
    return next((season for season in started if season.starts_on <= day), started[-1])


def is_day_locked(season: Season, day: date) -> bool:
    """
    Tell whether a closed Season locks a day: what came before it was closed is settled, what comes after, off-season, is not.

    Args:
        season (Season): Season the day counts in.
        day (date): Day of the record.

    Returns:
        bool: True when the record can no longer change.
    """
    if season.status != SeasonStatus.CLOSED:
        return False
    closed_on = season.closed_at.astimezone(APP_TIME_ZONE).date() if season.closed_at else season.ends_on
    return closed_on is None or day < closed_on


def get_period_range(db: Session, period: str) -> tuple[date, date]:
    """
    Turn a period of the Management pages into calendar days in Morocco: today, the last 7 days, this month, the Season, or the previous one. A Season runs from its first day until the next one starts, so off-season days count in it.

    Args:
        db (Session): Session to read Seasons with.
        period (str): today, week, month, season or previous.

    Returns:
        tuple[date, date]: First and last day, inclusive.
    """
    today = get_local_today()
    if period == "today":
        return today, today
    if period == "week":
        return today - timedelta(days=6), today
    if period == "month":
        return today.replace(day=1), today
    started = list_started_seasons(db)
    current_start = min(started[0].starts_on, today) if started else today
    if period == "season":
        return current_start, today
    previous_start = next((season.starts_on for season in started if season.starts_on < current_start), current_start - timedelta(days=365))
    return previous_start, current_start - timedelta(days=1)
