from datetime import timedelta

from sqlalchemy.orm import Session

from core.helpers import get_local_today
from modules.assistant.business.date_rules import PeriodContext
from modules.site.business.season_lookup import list_started_seasons


def load_period_context(db: Session) -> PeriodContext:
    """
    Read today and the Season starts the Assistant counts periods with, as the Home's periods do.

    Args:
        db (Session): Session to read Seasons with.

    Returns:
        PeriodContext: Today, this Season's first day and the previous one's.
    """
    today = get_local_today()
    started = list_started_seasons(db)
    season_starts_on = min(started[0].starts_on, today) if started else today
    previous_starts_on = next((season.starts_on for season in started if season.starts_on < season_starts_on), season_starts_on - timedelta(days=365))
    return PeriodContext(today=today, season_starts_on=season_starts_on, previous_season_starts_on=previous_starts_on)
