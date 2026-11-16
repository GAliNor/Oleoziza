from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

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
    Find the Season, open or closed, whose dates hold a day; a planned Season never holds records.

    Args:
        db (Session): Session to read with.
        day (date): Day to place.

    Returns:
        Season | None: The Season of that day.
    """
    return db.scalar(select(Season).where(Season.starts_on <= day, Season.ends_on >= day, Season.status != SeasonStatus.PLANNED))
