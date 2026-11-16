from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.helpers import get_local_today

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


def get_season_on(db: Session, day: date) -> Season | None:
    """
    Find the Season, open or closed, whose dates hold a day, the open one first when two overlap; a planned Season never holds records.

    Args:
        db (Session): Session to read with.
        day (date): Day to place.

    Returns:
        Season | None: The Season of that day.
    """
    query = select(Season).where(Season.starts_on <= day, Season.ends_on >= day, Season.status != SeasonStatus.PLANNED)
    return db.scalar(query.order_by(Season.status != SeasonStatus.OPEN, Season.starts_on.desc()).limit(1))


def get_period_range(db: Session, period: str) -> tuple[date, date]:
    """
    Turn a period of the Management pages into calendar days ending today in Morocco: today, the last 7 days, this month, this Season, or the previous Season.

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
    open_season = get_open_season(db)
    if period == "season":
        return (open_season.starts_on if open_season else today), today
    previous = db.scalar(select(Season).where(Season.status == SeasonStatus.CLOSED).order_by(Season.starts_on.desc()).limit(1))
    return (previous.starts_on, previous.ends_on) if previous else (today, today)
