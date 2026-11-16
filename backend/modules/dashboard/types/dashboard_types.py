from datetime import date
from uuid import UUID

from core.types import CamelModel
from modules.expense.types.expense_types import ExpenseSummaryOut
from modules.finance.types.finance_types import SalesOut


class ProductionOut(CamelModel):
    """
    The period's olives received and oil pressed.
    """

    olive_kg: float
    oil_litres: float
    receptions: int
    yield_per_quintal: float


class SeasonFiguresOut(CamelModel):
    """
    The Season so far, against the previous Season over as many days.
    """

    olive_kg: float
    oil_litres: float
    yield_per_quintal: float
    average_wait_hours: float
    lots_pressed: int
    olive_delta_pct: float
    oil_delta_pct: float
    yield_delta_pct: float
    wait_delta_pct: float


class ModeSplitOut(CamelModel):
    """
    Olives received for Service Milling and bought, in the period.
    """

    service_kg: float
    purchase_kg: float


class VarietyFiguresOut(CamelModel):
    """
    One variety's Lots, olives and oil in the period.
    """

    variety: str
    lots: int
    olives_kg: float
    oil_litres: float


class PressLineFiguresOut(CamelModel):
    """
    One Press Line's work: the Lots whose Pressing ended in the period.
    """

    press_line_id: UUID
    site_id: UUID
    number: int
    name: str | None
    site_name: str
    lots: int
    olives_kg: float
    oil_litres: float
    pressing_hours: float


class OliveBucketOut(CamelModel):
    """
    One bar of the olives chart: a day or a week, labelled by the front.
    """

    starts_on: date
    ends_on: date
    olive_kg: float
    oil_litres: float
    is_current: bool


class TankOut(CamelModel):
    """
    A Tank and what it holds now; the front names it from its number.
    """

    id: UUID
    site_id: UUID
    site_name: str
    number: int
    capacity_litres: float
    fill_litres: float
    variety: str | None


class SiteFiguresOut(CamelModel):
    """
    One Site's day and Season at a glance.
    """

    site_id: UUID
    name: str
    olive_kg_today: float
    oil_litres_today: float
    queue: int
    yield_per_quintal: float
    revenue_season: float
    outstanding: float


class DashboardOut(CamelModel):
    """
    The Management Home in one request: production, Season, varieties, Press Lines, chart, Tanks and Sites, plus the sales and Expense summary for those who see the finances.
    """

    production: ProductionOut
    season: SeasonFiguresOut
    mode_split: ModeSplitOut
    varieties: list[VarietyFiguresOut]
    press_lines: list[PressLineFiguresOut]
    olive_chart_title_key: str
    olive_buckets: list[OliveBucketOut]
    tanks: list[TankOut]
    sites: list[SiteFiguresOut]
    sales: SalesOut | None = None
    expense_summary: ExpenseSummaryOut | None = None
