from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo


APP_TIME_ZONE = ZoneInfo("Africa/Casablanca")


def get_local_today() -> date:
    """
    Give today's date in Morocco, whatever the server's clock zone.

    Returns:
        date: Today in Morocco.
    """
    return datetime.now(APP_TIME_ZONE).date()


def get_local_midnight(day: date) -> datetime:
    """
    Give the instant a day starts in Morocco, as an aware UTC datetime.

    Args:
        day (date): Calendar day.

    Returns:
        datetime: Midnight of that day in Morocco, in UTC.
    """
    return datetime.combine(day, time.min, tzinfo=APP_TIME_ZONE).astimezone(timezone.utc)
