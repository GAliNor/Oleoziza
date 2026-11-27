from dataclasses import dataclass
from datetime import date, timedelta


HOME_TO_PLAN_PERIOD = {"today": "today", "week": "last_7_days", "month": "this_month", "season": "season", "previous": "previous_season"}


@dataclass(frozen=True)
class PeriodContext:
    today: date
    season_starts_on: date
    previous_season_starts_on: date


def shift_month(day: date, offset: int) -> date:
    """
    Give the first day of a month relative to a day.

    Args:
        day (date): Reference day in Morocco.
        offset (int): Months to move.

    Returns:
        date: First day of that month.
    """
    month = day.year * 12 + day.month - 1 + offset
    return date(month // 12, month % 12 + 1, 1)


def resolve_period(period: str, context: PeriodContext) -> tuple[date, date] | None:
    """
    Turn a named period into an inclusive start and exclusive end in Morocco; a Season runs from its first day until the next one starts.

    Args:
        period (str): A plan period.
        context (PeriodContext): Today and the Season starts.

    Returns:
        tuple[date, date] | None: Start and end, or None for all_time.

    Raises:
        ValueError: The period is unknown.
    """
    today = context.today
    tomorrow = today + timedelta(days=1)
    week_start = today - timedelta(days=today.weekday())
    ranges = {
        "today": (today, tomorrow),
        "yesterday": (today - timedelta(days=1), today),
        "this_week": (week_start, tomorrow),
        "last_week": (week_start - timedelta(days=7), week_start),
        "last_7_days": (today - timedelta(days=6), tomorrow),
        "this_month": (shift_month(today, 0), tomorrow),
        "last_month": (shift_month(today, -1), shift_month(today, 0)),
        "this_year": (date(today.year, 1, 1), tomorrow),
        "last_year": (date(today.year - 1, 1, 1), date(today.year, 1, 1)),
        "season": (context.season_starts_on, tomorrow),
        "previous_season": (context.previous_season_starts_on, context.season_starts_on),
    }
    if period == "all_time":
        return None
    if period not in ranges:
        raise ValueError("Unknown period")
    return ranges[period]


def shift_window(starts_on: date, ends_before: date, compare: str, context: PeriodContext) -> tuple[date, date]:
    """
    Give the window a figure compares with: the same length just before, or the same days of the previous Season (as the Home compares Seasons, over as many days).

    Args:
        starts_on (date): First day of the window.
        ends_before (date): Day after its last day.
        compare (str): previous_period or previous_season.
        context (PeriodContext): Season starts.

    Returns:
        tuple[date, date]: The earlier window, start inclusive, end exclusive.
    """
    if compare == "previous_season":
        offset = context.season_starts_on - context.previous_season_starts_on
        return starts_on - offset, ends_before - offset
    length = ends_before - starts_on
    return starts_on - length, starts_on
