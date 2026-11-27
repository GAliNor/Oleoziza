from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

from modules.ai.types.ai_types import BUDGET_TIME_ZONE, CHARACTERS_PER_TOKEN_ESTIMATE, TOKENS_PER_PRICE_UNIT


USD_QUANTUM = Decimal("0.000001")


@dataclass(frozen=True)
class ModelPrices:
    input_per_million: Decimal
    cached_input_per_million: Decimal | None
    output_per_million: Decimal


@dataclass(frozen=True)
class TokenUsage:
    input_tokens: int
    cached_input_tokens: int
    output_tokens: int


def estimate_tokens(text: str) -> int:
    """
    Estimate how many tokens a text takes, from its length.

    Args:
        text (str): Prompt text.

    Returns:
        int: Estimated token count, at least 1.
    """
    return max(1, -(-len(text) // CHARACTERS_PER_TOKEN_ESTIMATE))


def compute_cost(prices: ModelPrices, usage: TokenUsage) -> Decimal:
    """
    Price a call from its tokens: cached input at the cached price when the model has one, the rest of the input and the output at their prices.

    Args:
        prices (ModelPrices): The model's prices per million tokens, frozen on the call.
        usage (TokenUsage): Tokens the provider reported.

    Returns:
        Decimal: Cost in USD, to the micro-dollar.
    """
    cached_tokens = min(usage.cached_input_tokens, usage.input_tokens) if prices.cached_input_per_million is not None else 0
    uncached_tokens = usage.input_tokens - cached_tokens
    cost = (
        Decimal(uncached_tokens) * prices.input_per_million
        + Decimal(cached_tokens) * (prices.cached_input_per_million or Decimal("0"))
        + Decimal(usage.output_tokens) * prices.output_per_million
    ) / TOKENS_PER_PRICE_UNIT
    return cost.quantize(USD_QUANTUM, rounding=ROUND_HALF_UP)


def estimate_cost(prices: ModelPrices, prompt_text: str, max_output_tokens: int) -> Decimal:
    """
    Estimate the most a call can cost before it runs: the prompt's estimated tokens at the input price, plus the whole output limit.

    Args:
        prices (ModelPrices): The model's prices per million tokens.
        prompt_text (str): Everything sent as prompt.
        max_output_tokens (int): Output limit asked from the provider.

    Returns:
        Decimal: Estimated cost in USD.
    """
    return compute_cost(prices, TokenUsage(input_tokens=estimate_tokens(prompt_text), cached_input_tokens=0, output_tokens=max_output_tokens))


def get_budget_month_bounds(moment: datetime) -> tuple[datetime, datetime]:
    """
    Give the calendar month, in the mill's time zone, that a moment falls in, as UTC bounds.

    Args:
        moment (datetime): Aware moment.

    Returns:
        tuple[datetime, datetime]: Start (inclusive) and end (exclusive) of the month, in UTC.
    """
    zone = ZoneInfo(BUDGET_TIME_ZONE)
    local = moment.astimezone(zone)
    start = datetime.combine(date(local.year, local.month, 1), time.min, tzinfo=zone)
    end = datetime.combine((start + timedelta(days=32)).date().replace(day=1), time.min, tzinfo=zone)
    return start.astimezone(UTC), end.astimezone(UTC)


def parse_budget_month(month: str | None, now: datetime) -> datetime:
    """
    Read a "YYYY-MM" month into a moment inside it, defaulting to the current month.

    Args:
        month (str | None): Month asked, for example "2026-11".
        now (datetime): Current moment.

    Returns:
        datetime: Noon on the 15th of that month in the mill's time zone, or now.
    """
    if not month:
        return now
    year, month_number = (int(part) for part in month.split("-", 1))
    return datetime(year, month_number, 15, 12, tzinfo=ZoneInfo(BUDGET_TIME_ZONE))


def format_budget_month(moment: datetime) -> str:
    """
    Write the mill-time month of a moment as "YYYY-MM".

    Args:
        moment (datetime): Aware moment.

    Returns:
        str: The month.
    """
    return moment.astimezone(ZoneInfo(BUDGET_TIME_ZONE)).strftime("%Y-%m")


def is_over_budget(budget_usd: Decimal, spent_usd: Decimal, estimated_usd: Decimal) -> bool:
    """
    Tell whether a call would take its key past the monthly AI budget.

    Args:
        budget_usd (Decimal): The key's monthly budget.
        spent_usd (Decimal): Already spent or reserved this month.
        estimated_usd (Decimal): The call's estimated cost.

    Returns:
        bool: True when the call must be refused.
    """
    return spent_usd + estimated_usd > budget_usd
