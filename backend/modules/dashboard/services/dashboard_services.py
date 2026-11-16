from datetime import date, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import get_db
from core.helpers import APP_TIME_ZONE, get_local_today
from core.integrations.rustfs.rustfs_client import RustFSClient, get_rustfs_client
from core.security import get_current_user
from core.types import CurrentUser
from modules.configuration.models.configuration_models import OliveVariety, PressLine, Tank
from modules.dashboard.types.dashboard_types import DashboardOut, ModeSplitOut, OliveBucketOut, PressLineFiguresOut, ProductionOut, SeasonFiguresOut, SiteFiguresOut, TankOut, VarietyFiguresOut
from modules.expense.services.expense_services import ExpenseService
from modules.finance.business.lot_fees import get_amounts_due, get_fees
from modules.finance.services.finance_desk_services import FinanceDeskService, build_day_buckets, build_week_buckets
from modules.lot.models.lot_models import Lot
from modules.lot.types.lot_types import LotMode, LotStatus
from modules.oil.business.tank_fill import get_tank_fills
from modules.oil.models.oil_models import Storage
from modules.site.business.season_lookup import get_period_range
from modules.site.business.site_scope import resolve_site_ids
from modules.site.models.site_models import Site
from modules.user.types.user_types import Permission


class DashboardService:
    def __init__(self, db: Session, current_user: CurrentUser, storage: RustFSClient) -> None:
        """
        Keep the session, the User reading the Dashboard, and the storage the finance figures need.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
            storage (RustFSClient): RustFS client.
        """
        self.db = db
        self.current_user = current_user
        self.storage = storage

    def get_dashboard(self, site_ids: list[UUID], period: str) -> DashboardOut:
        """
        Compute the Management Home for the Sites and period in one answer, from the Lots of this and the previous Season read in one query; derived, never stored.

        Args:
            site_ids (list[UUID]): Sites, every Site held when none.
            period (str): today, week, month, season or previous.

        Returns:
            DashboardOut: Every figure the Home shows, with the sales and Expense summary for those who see the finances.
        """
        scoped = resolve_site_ids(self.db, self.current_user, site_ids)
        today = get_local_today()
        period_start, period_end = get_period_range(self.db, period)
        season_start, _ = get_period_range(self.db, "season")
        previous_start, previous_end = get_period_range(self.db, "previous")
        previous_cut = min(previous_start + timedelta(days=(today - season_start).days), previous_end)
        sites = {site.id: site for site in self.db.scalars(select(Site).where(Site.id.in_(scoped)))}
        varieties = dict(self.db.execute(select(OliveVariety.id, OliveVariety.name)).all())
        lots = list(self.db.scalars(select(Lot).where(Lot.site_id.in_(scoped), Lot.entered_at >= to_moment(min(period_start, season_start, previous_start)))))
        received = [lot for lot in lots if period_start <= day_of(lot.entered_at) <= period_end]
        pressed = [lot for lot in lots if lot.pressing_ended_at and period_start <= day_of(lot.pressing_ended_at) <= period_end]
        season_lots = [lot for lot in lots if day_of(lot.entered_at) >= season_start]
        previous_lots = [lot for lot in lots if previous_start <= day_of(lot.entered_at) <= previous_cut]
        buckets = build_day_buckets(today) if period in ("today", "week") else build_week_buckets(period_start, period_end)
        sees_money = all(self.current_user.has_permission(site_id, Permission.FINANCE_VIEW) for site_id in scoped)
        return DashboardOut(
            production=ProductionOut(olive_kg=kg(received), oil_litres=oil(pressed), receptions=len(received), yield_per_quintal=yield_of(pressed)),
            season=build_season(season_lots, previous_lots),
            mode_split=ModeSplitOut(service_kg=kg([lot for lot in received if lot.mode == LotMode.SERVICE_MILLING]), purchase_kg=kg([lot for lot in received if lot.mode == LotMode.PURCHASE])),
            varieties=build_varieties(received, varieties),
            press_lines=self._build_press_lines(scoped, pressed, sites),
            olive_chart_title_key="dashboard.management.oliveChart.days" if period in ("today", "week") else ("dashboard.management.oliveChart.monthWeeks" if period == "month" else "dashboard.management.oliveChart.seasonWeeks"),
            olive_buckets=[build_olive_bucket(lots, start, end, today) for start, end in buckets],
            tanks=self._build_tanks(scoped, sites, varieties),
            sites=self._build_sites(sites, season_lots, today),
            sales=FinanceDeskService(self.db, self.current_user, self.storage).get_sales(scoped, period) if sees_money else None,
            expense_summary=ExpenseService(self.db, self.current_user, self.storage).get_summary(scoped, period) if sees_money else None,
        )

    def _build_press_lines(self, site_ids: list[UUID], pressed: list[Lot], sites: dict[UUID, Site]) -> list[PressLineFiguresOut]:
        """
        Each Press Line's Lots pressed in the period, its olives, oil and hours of Pressing.

        Args:
            site_ids (list[UUID]): Sites in scope.
            pressed (list[Lot]): Lots whose Pressing ended in the period.
            sites (dict[UUID, Site]): Sites by id.

        Returns:
            list[PressLineFiguresOut]: One row per Press Line in service.
        """
        lines = self.db.scalars(select(PressLine).where(PressLine.site_id.in_(site_ids), PressLine.retired_at.is_(None)).order_by(PressLine.site_id, PressLine.number))
        rows = []
        for line in lines:
            line_lots = [lot for lot in pressed if lot.press_line_id == line.id]
            hours = sum(((lot.pressing_ended_at - lot.pressing_started_at).total_seconds() / 3600 for lot in line_lots if lot.pressing_started_at and lot.pressing_ended_at), 0.0)
            rows.append(PressLineFiguresOut(press_line_id=line.id, site_id=line.site_id, number=line.number, name=line.name, site_name=sites[line.site_id].name, lots=len(line_lots), olives_kg=kg(line_lots), oil_litres=oil(line_lots), pressing_hours=round(hours, 1)))
        return rows

    def _build_tanks(self, site_ids: list[UUID], sites: dict[UUID, Site], varieties: dict[str, str]) -> list[TankOut]:
        """
        Each Tank in service with what it holds and the variety of its latest open Storage, in three queries.

        Args:
            site_ids (list[UUID]): Sites in scope.
            sites (dict[UUID, Site]): Sites by id.
            varieties (dict[str, str]): Variety names by slug.

        Returns:
            list[TankOut]: The Tanks.
        """
        tanks = list(self.db.scalars(select(Tank).where(Tank.site_id.in_(site_ids), Tank.retired_at.is_(None)).order_by(Tank.site_id, Tank.number)))
        if not tanks:
            return []
        fills = get_tank_fills(self.db, [tank.id for tank in tanks])
        latest_variety: dict[UUID, str] = {}
        for tank_id, variety_id in self.db.execute(select(Storage.tank_id, Lot.olive_variety_id).join(Lot, Lot.id == Storage.lot_id).where(Storage.tank_id.in_([tank.id for tank in tanks]), Storage.ended_at.is_(None)).order_by(Storage.stored_from)):
            latest_variety[tank_id] = varieties.get(variety_id, variety_id)
        return [TankOut(id=tank.id, site_id=tank.site_id, site_name=sites[tank.site_id].name, number=tank.number, capacity_litres=float(tank.capacity_in_litres), fill_litres=float(fills[tank.id]), variety=latest_variety.get(tank.id) if fills[tank.id] > 0 else None) for tank in tanks]

    def _build_sites(self, sites: dict[UUID, Site], season_lots: list[Lot], today: date) -> list[SiteFiguresOut]:
        """
        Each Site's day (olives in, oil out, queue) and Season (yield, revenue, what is still owed).

        Args:
            sites (dict[UUID, Site]): Sites in scope.
            season_lots (list[Lot]): The Season's Lots.
            today (date): Today in Morocco.

        Returns:
            list[SiteFiguresOut]: One row per Site, by code.
        """
        fees = get_fees(self.db, season_lots)
        dues = get_amounts_due(self.db, season_lots)
        rows = []
        for site in sorted(sites.values(), key=lambda item: item.code):
            site_lots = [lot for lot in season_lots if lot.site_id == site.id]
            rows.append(
                SiteFiguresOut(
                    site_id=site.id,
                    name=site.name,
                    olive_kg_today=kg([lot for lot in site_lots if day_of(lot.entered_at) == today]),
                    oil_litres_today=oil([lot for lot in site_lots if lot.pressing_ended_at and day_of(lot.pressing_ended_at) == today]),
                    queue=sum(1 for lot in site_lots if lot.status == LotStatus.WAITING),
                    yield_per_quintal=yield_of([lot for lot in site_lots if lot.oil_in_litres is not None]),
                    revenue_season=float(sum((fees[lot.id] for lot in site_lots), Decimal(0))),
                    outstanding=float(sum((dues[lot.id] for lot in site_lots), Decimal(0))),
                )
            )
        return rows


def build_season(season_lots: list[Lot], previous_lots: list[Lot]) -> SeasonFiguresOut:
    """
    The Season so far and its change against the previous Season over as many days.

    Args:
        season_lots (list[Lot]): This Season's Lots.
        previous_lots (list[Lot]): The previous Season's Lots over the same number of days.

    Returns:
        SeasonFiguresOut: Figures and deltas in percent.
    """
    current = (kg(season_lots), oil(season_lots), yield_of([lot for lot in season_lots if lot.oil_in_litres is not None]), wait_hours(season_lots))
    previous = (kg(previous_lots), oil(previous_lots), yield_of([lot for lot in previous_lots if lot.oil_in_litres is not None]), wait_hours(previous_lots))
    deltas = [round((now - before) / before * 100, 1) if before else 0.0 for now, before in zip(current, previous)]
    return SeasonFiguresOut(olive_kg=current[0], oil_litres=current[1], yield_per_quintal=current[2], average_wait_hours=current[3], lots_pressed=sum(1 for lot in season_lots if lot.pressing_ended_at), olive_delta_pct=deltas[0], oil_delta_pct=deltas[1], yield_delta_pct=deltas[2], wait_delta_pct=deltas[3])


def build_varieties(lots: list[Lot], varieties: dict[str, str]) -> list[VarietyFiguresOut]:
    """
    Lots, olives and oil per variety, largest first.

    Args:
        lots (list[Lot]): Lots received in the period.
        varieties (dict[str, str]): Variety names by slug.

    Returns:
        list[VarietyFiguresOut]: One row per variety received.
    """
    by_variety: dict[str, list[Lot]] = {}
    for lot in lots:
        by_variety.setdefault(lot.olive_variety_id, []).append(lot)
    rows = [VarietyFiguresOut(variety=varieties.get(variety_id, variety_id), lots=len(variety_lots), olives_kg=kg(variety_lots), oil_litres=oil(variety_lots)) for variety_id, variety_lots in by_variety.items()]
    return sorted(rows, key=lambda row: -row.olives_kg)


def build_olive_bucket(lots: list[Lot], starts_on: date, ends_on: date, today: date) -> OliveBucketOut:
    """
    Olives received and oil pressed over one day or week.

    Returns:
        OliveBucketOut: The bar.
    """
    received = [lot for lot in lots if starts_on <= day_of(lot.entered_at) <= ends_on]
    pressed = [lot for lot in lots if lot.pressing_ended_at and starts_on <= day_of(lot.pressing_ended_at) <= ends_on]
    return OliveBucketOut(starts_on=starts_on, ends_on=ends_on, olive_kg=kg(received), oil_litres=oil(pressed), is_current=starts_on <= today <= ends_on)


def kg(lots: list[Lot]) -> float:
    """
    Net kilograms of Lots.

    Returns:
        float: Kilograms.
    """
    return float(sum((lot.net_weight_in_kg for lot in lots), Decimal(0)))


def oil(lots: list[Lot]) -> float:
    """
    Litres of oil of Lots already pressed.

    Returns:
        float: Litres.
    """
    return float(sum((lot.oil_in_litres or Decimal(0) for lot in lots), Decimal(0)))


def yield_of(pressed: list[Lot]) -> float:
    """
    Litres of oil per quintal (100 kg) of olives pressed.

    Returns:
        float: Yield, 0 with nothing pressed.
    """
    olives = kg(pressed)
    return round(oil(pressed) / olives * 100, 1) if olives else 0.0


def wait_hours(lots: list[Lot]) -> float:
    """
    Average hours between Reception and the start of Pressing.

    Returns:
        float: Hours, 0 when nothing started.
    """
    waits = [(lot.pressing_started_at - lot.entered_at).total_seconds() / 3600 for lot in lots if lot.pressing_started_at]
    return round(sum(waits) / len(waits), 1) if waits else 0.0


def to_moment(day: date) -> datetime:
    """
    The start of a Moroccan day.

    Returns:
        datetime: Aware moment.
    """
    return datetime.combine(day, time.min, APP_TIME_ZONE)


def day_of(moment: datetime) -> date:
    """
    The Moroccan day of a moment.

    Returns:
        date: Day.
    """
    return moment.astimezone(APP_TIME_ZONE).date()


def get_dashboard_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user), storage: RustFSClient = Depends(get_rustfs_client)) -> DashboardService:
    """
    Build the dashboard service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.
        storage (RustFSClient): Shared RustFS client.

    Returns:
        DashboardService: Service bound to the session, actor and storage.
    """
    return DashboardService(db, current_user, storage)
