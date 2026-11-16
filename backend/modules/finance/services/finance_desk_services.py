from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.helpers import APP_TIME_ZONE, get_local_today
from core.integrations.rustfs.rustfs_client import RustFSClient, get_rustfs_client
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.configuration.types.configuration_types import PaymentMethod
from modules.file.business.private_files import store_private_file
from modules.finance.business.client_credit import get_lot_credits
from modules.finance.business.lot_fees import get_fees
from modules.finance.business.movement_views import build_refund_views
from modules.finance.models.finance_models import DebtContact, Payment, PaymentAllocation, PaymentProof, Refund
from modules.finance.types.finance_types import (
    DebtContactIn,
    DebtContactOut,
    PaymentMethodShareOut,
    PaymentStatus,
    RefundMadeIn,
    RefundOut,
    RefundStatus,
    SalesBucketOut,
    SalesFiguresOut,
    SalesOut,
)
from modules.lot.business.lot_views import list_user_names
from modules.lot.models.lot_models import Lot
from modules.site.business.season_lookup import get_period_range
from modules.site.business.site_scope import resolve_site_ids
from modules.user.types.user_types import Permission


REFUND_MADE_ACTION = "refund.made"

REFUND_CONFIRMED_ACTION = "refund.confirmed"

DEBT_CONTACT_ADDED_ACTION = "debt_contact.added"


class FinanceDeskService:
    def __init__(self, db: Session, current_user: CurrentUser, storage: RustFSClient) -> None:
        """
        Keep the session, the User working the finances, and the storage holding Refund Proofs.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
            storage (RustFSClient): RustFS client.
        """
        self.db = db
        self.current_user = current_user
        self.storage = storage

    def list_refunds(self, site_ids: list[UUID], offset: int = 0, limit: int | None = None) -> tuple[list[RefundOut], int]:
        """
        List the Refunds of the Sites asked for, those to make first, then newest.

        Args:
            site_ids (list[UUID]): Sites to read.
            offset (int): First row.
            limit (int | None): Rows per page, every row when None.

        Returns:
            tuple[list[RefundOut], int]: The Refunds and their count.
        """
        scoped = resolve_site_ids(self.db, self.current_user, site_ids)
        query = select(Refund).where(Refund.site_id.in_(scoped)).order_by((Refund.status == RefundStatus.CONFIRMED), Refund.created_at.desc(), Refund.id)
        total = self.db.scalar(select(func.count()).select_from(Refund).where(Refund.site_id.in_(scoped)))
        refunds = list(self.db.scalars(query.offset(offset).limit(limit) if limit else query))
        return build_refund_views(self.db, self.storage, refunds), total or 0

    def make_refund(self, refund_id: UUID, payload: RefundMadeIn) -> RefundOut:
        """
        Record that a Refund was paid back, how, and with which Proofs; a repeat answers it as it is.

        Args:
            refund_id (UUID): Refund paid back.
            payload (RefundMadeIn): Method, reference and Proofs.

        Returns:
            RefundOut: The Refund.

        Raises:
            RefusedError: refund_not_found, refunds_forbidden, refund_not_to_make, method_invalid.
        """
        refund = self._get_refund(refund_id)
        if refund.status != RefundStatus.TO_MAKE:
            if refund.made_by_id == self.current_user.id:
                return build_refund_views(self.db, self.storage, [refund])[0]
            raise RefusedError("refund_not_to_make")
        try:
            method = PaymentMethod(payload.method)
        except ValueError as error:
            raise RefusedError("method_invalid", 422) from error
        if method == PaymentMethod.OIL:
            raise RefusedError("method_invalid", 422)
        refund.status = RefundStatus.MADE
        refund.method = method
        refund.reference = payload.reference
        refund.made_at = datetime.now(timezone.utc)
        refund.made_by_id = self.current_user.id
        for document in payload.documents:
            file = store_private_file(self.db, self.storage, document.url, document.name, self.current_user.id)
            self.db.flush()
            self.db.add(PaymentProof(file_id=file.id, refund_id=refund.id, created_by_id=self.current_user.id))
        record_audit_event(self.db, self.current_user.id, REFUND_MADE_ACTION, site_id=refund.site_id, entity_type="refund", entity_id=refund.id, after={"method": method.value})
        self.db.commit()
        return build_refund_views(self.db, self.storage, [refund])[0]

    def confirm_refund(self, refund_id: UUID) -> RefundOut:
        """
        Confirm a Refund paid back; whoever made it can't confirm it.

        Args:
            refund_id (UUID): Refund to confirm.

        Returns:
            RefundOut: The Refund.

        Raises:
            RefusedError: refund_not_found, refunds_forbidden, refund_not_made, refund_own.
        """
        refund = self._get_refund(refund_id)
        if refund.status == RefundStatus.CONFIRMED:
            return build_refund_views(self.db, self.storage, [refund])[0]
        if refund.status != RefundStatus.MADE:
            raise RefusedError("refund_not_made")
        if refund.made_by_id == self.current_user.id:
            raise RefusedError("refund_own", 403)
        refund.status = RefundStatus.CONFIRMED
        refund.confirmed_at = datetime.now(timezone.utc)
        refund.confirmed_by_id = self.current_user.id
        record_audit_event(self.db, self.current_user.id, REFUND_CONFIRMED_ACTION, site_id=refund.site_id, entity_type="refund", entity_id=refund.id)
        self.db.commit()
        return build_refund_views(self.db, self.storage, [refund])[0]

    def list_debt_contacts(self, site_ids: list[UUID]) -> list[DebtContactOut]:
        """
        List the Debt Follow-up's contacts on the Sites asked for, newest first.

        Args:
            site_ids (list[UUID]): Sites to read.

        Returns:
            list[DebtContactOut]: The contacts.
        """
        scoped = resolve_site_ids(self.db, self.current_user, site_ids)
        contacts = list(self.db.scalars(select(DebtContact).where(DebtContact.site_id.in_(scoped)).order_by(DebtContact.entered_at.desc())))
        names = list_user_names(self.db, {contact.created_by_id for contact in contacts if contact.created_by_id})
        return [map_debt_contact(contact, names) for contact in contacts]

    def add_debt_contact(self, payload: DebtContactIn) -> DebtContactOut:
        """
        Log a contact with a Client who owes; a replay answers the contact already logged.

        Args:
            payload (DebtContactIn): The contact.

        Returns:
            DebtContactOut: The contact.

        Raises:
            RefusedError: debts_forbidden.
        """
        existing = self.db.get(DebtContact, payload.id)
        if existing is None:
            if not self.current_user.has_permission(payload.site_id, Permission.DEBT_FOLLOW):
                raise RefusedError("debts_forbidden", 403)
            existing = DebtContact(id=payload.id, site_id=payload.site_id, client_id=payload.client_id, kind=payload.kind, note=payload.note.strip(), promised_on=payload.promised_on, entered_at=datetime.now(timezone.utc), created_by_id=self.current_user.id)
            self.db.add(existing)
            self.db.flush()
            record_audit_event(self.db, self.current_user.id, DEBT_CONTACT_ADDED_ACTION, site_id=payload.site_id, entity_type="client", entity_id=payload.client_id, after={"kind": payload.kind.value, "promisedOn": payload.promised_on.isoformat() if payload.promised_on else None})
            self.db.commit()
        return map_debt_contact(existing, list_user_names(self.db, {existing.created_by_id} if existing.created_by_id else set()))

    def get_sales(self, site_ids: list[UUID], period: str) -> SalesOut:
        """
        Compute the Finances tab for one period: the four figures over the Lots received in it, the chart's day or week buckets, and the methods of the money confirmed.

        Args:
            site_ids (list[UUID]): Sites to read.
            period (str): today, week, month, season or previous.

        Returns:
            SalesOut: Figures, buckets and methods.
        """
        scoped = resolve_site_ids(self.db, self.current_user, site_ids)
        starts_on, ends_on = get_period_range(self.db, period)
        today = get_local_today()
        buckets = build_day_buckets(today) if period in ("today", "week") else build_week_buckets(starts_on, ends_on)
        chart_starts_on = min(starts_on, buckets[0][0]) if buckets else starts_on
        lots = list(self.db.scalars(select(Lot).where(Lot.site_id.in_(scoped), Lot.entered_at >= to_moment(chart_starts_on, time.min), Lot.entered_at <= to_moment(max(ends_on, today), time.max))))
        fees = get_fees(self.db, lots)
        allocations = self.db.execute(
            select(PaymentAllocation.lot_id, PaymentAllocation.amount, Payment.status, Payment.method, Payment.decided_at).join(Payment, Payment.id == PaymentAllocation.payment_id).where(Payment.site_id.in_(scoped), Payment.status.in_((PaymentStatus.CONFIRMED, PaymentStatus.PENDING)))
        ).all()
        cohort = [lot for lot in lots if starts_on <= local_day(lot.entered_at) <= ends_on]
        cohort_ids = {lot.id for lot in cohort}
        credits = get_lot_credits(self.db, list(cohort_ids)) if cohort_ids else {}
        confirmed = sum_by_lot(allocations, PaymentStatus.CONFIRMED)
        pending = sum_by_lot(allocations, PaymentStatus.PENDING)
        revenue = sum((fees[lot.id] for lot in cohort), Decimal(0))
        pending_total = sum((min(pending.get(lot.id, Decimal(0)), max(fees[lot.id] - confirmed.get(lot.id, Decimal(0)) - credits.get(lot.id, Decimal(0)), Decimal(0))) for lot in cohort), Decimal(0))
        outstanding = sum((max(fees[lot.id] - confirmed.get(lot.id, Decimal(0)) - pending.get(lot.id, Decimal(0)) - credits.get(lot.id, Decimal(0)), Decimal(0)) for lot in cohort), Decimal(0))
        pending_count = self.db.scalar(select(func.count(func.distinct(Payment.id))).join(PaymentAllocation, PaymentAllocation.payment_id == Payment.id).where(Payment.status == PaymentStatus.PENDING, PaymentAllocation.lot_id.in_(cohort_ids))) if cohort_ids else 0
        figures = SalesFiguresOut(revenue=float(revenue), collected=float(revenue - pending_total - outstanding), pending=float(pending_total), outstanding=float(outstanding), pending_count=pending_count or 0)
        bars = [
            SalesBucketOut(
                starts_on=bucket_start,
                ends_on=bucket_end,
                revenue=float(sum((fees[lot.id] for lot in lots if bucket_start <= local_day(lot.entered_at) <= bucket_end), Decimal(0))),
                collected=float(sum((amount for _, amount, status, _, decided_at in allocations if status == PaymentStatus.CONFIRMED and decided_at and bucket_start <= local_day(decided_at) <= bucket_end), Decimal(0))),
                is_current=bucket_start <= today <= bucket_end,
            )
            for bucket_start, bucket_end in buckets
        ]
        methods = [PaymentMethodShareOut(key=method.value, amount=float(sum((amount for lot_id, amount, status, paid_by, _ in allocations if status == PaymentStatus.CONFIRMED and paid_by == method and lot_id in cohort_ids), Decimal(0)))) for method in PaymentMethod]
        title_key = "finance.sales.chart.days" if period in ("today", "week") else ("finance.sales.chart.monthWeeks" if period == "month" else "finance.sales.chart.seasonWeeks")
        return SalesOut(figures=figures, chart_title_key=title_key, buckets=bars, methods=methods)

    def _get_refund(self, refund_id: UUID) -> Refund:
        """
        Load a Refund the caller may handle.

        Args:
            refund_id (UUID): Refund id.

        Returns:
            Refund: The Refund.

        Raises:
            RefusedError: refund_not_found, refunds_forbidden.
        """
        refund = self.db.get(Refund, refund_id)
        if refund is None:
            raise RefusedError("refund_not_found", 404)
        if not self.current_user.has_permission(refund.site_id, Permission.REFUND_MANAGE):
            raise RefusedError("refunds_forbidden", 403)
        return refund


def sum_by_lot(allocations: list, status: PaymentStatus) -> dict[UUID, Decimal]:
    """
    Sum allocated amounts per Lot for one Payment status.

    Args:
        allocations (list): Rows (lot_id, amount, status, method, decided_at).
        status (PaymentStatus): Status to keep.

    Returns:
        dict[UUID, Decimal]: Amount per Lot.
    """
    totals: dict[UUID, Decimal] = {}
    for lot_id, amount, row_status, _, _ in allocations:
        if row_status == status:
            totals[lot_id] = totals.get(lot_id, Decimal(0)) + amount
    return totals


def build_day_buckets(today: date) -> list[tuple[date, date]]:
    """
    The last 7 days, one bucket each.

    Args:
        today (date): Today in Morocco.

    Returns:
        list[tuple[date, date]]: Buckets, oldest first.
    """
    return [(today - timedelta(days=offset), today - timedelta(days=offset)) for offset in range(6, -1, -1)]


def build_week_buckets(starts_on: date, ends_on: date) -> list[tuple[date, date]]:
    """
    Seven-day buckets from the period's first day.

    Args:
        starts_on (date): First day.
        ends_on (date): Last day.

    Returns:
        list[tuple[date, date]]: Buckets, oldest first.
    """
    buckets = []
    start = starts_on
    while start <= ends_on:
        buckets.append((start, min(start + timedelta(days=6), ends_on)))
        start += timedelta(days=7)
    return buckets


def to_moment(day: date, at: time) -> datetime:
    """
    A moment of a Moroccan calendar day.

    Args:
        day (date): Day.
        at (time): Time of day.

    Returns:
        datetime: Aware moment.
    """
    return datetime.combine(day, at, APP_TIME_ZONE)


def local_day(moment: datetime) -> date:
    """
    The Moroccan calendar day of a moment.

    Args:
        moment (datetime): Aware moment.

    Returns:
        date: Day in Morocco.
    """
    return moment.astimezone(APP_TIME_ZONE).date()


def map_debt_contact(contact: DebtContact, names: dict[UUID, str]) -> DebtContactOut:
    """
    Shape a Debt Contact for the front.

    Args:
        contact (DebtContact): Row.
        names (dict[UUID, str]): Names of the Users involved.

    Returns:
        DebtContactOut: The contact.
    """
    return DebtContactOut(id=contact.id, site_id=contact.site_id, client_id=contact.client_id, kind=contact.kind, note=contact.note, promised_on=contact.promised_on, by=names.get(contact.created_by_id, "") if contact.created_by_id else "", at=contact.entered_at)


def get_finance_desk_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user), storage: RustFSClient = Depends(get_rustfs_client)) -> FinanceDeskService:
    """
    Build the finance desk service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.
        storage (RustFSClient): Shared RustFS client.

    Returns:
        FinanceDeskService: Service bound to the session, actor and storage.
    """
    return FinanceDeskService(db, current_user, storage)
