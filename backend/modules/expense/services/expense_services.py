from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import Depends
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.helpers import get_local_today
from core.integrations.rustfs.rustfs_client import RustFSClient, get_rustfs_client
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.expense.business.expense_views import build_expense_views
from modules.expense.models.expense_models import Expense, ExpenseCategory, ExpenseDocument, Supplier
from modules.expense.types.expense_types import (
    ICE_LENGTH,
    INVESTMENT_CATEGORY_ID,
    VAT_RATES,
    ExpenseCancelIn,
    ExpenseCategoryOut,
    ExpenseCategoryTotalOut,
    ExpenseCategoryType,
    ExpenseIn,
    ExpenseOut,
    ExpenseStatus,
    ExpenseSummaryOut,
    SupplierIn,
    SupplierOut,
)
from modules.file.business.private_files import store_private_file
from modules.site.business.code_sequences import give_next_code
from modules.site.business.season_lookup import get_period_range, get_season_on
from modules.site.business.site_scope import resolve_site_ids
from modules.site.models.site_models import Season, Site
from modules.site.types.site_types import CodeKind, SeasonStatus
from modules.user.types.user_types import Permission


EXPENSE_CREATED_ACTION = "expense.entered"

EXPENSE_UPDATED_ACTION = "expense.changed"

EXPENSE_CANCELLED_ACTION = "expense.cancelled"


class ExpenseService:
    def __init__(self, db: Session, current_user: CurrentUser, storage: RustFSClient) -> None:
        """
        Keep the session, the User keeping the register, and the storage holding invoices.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
            storage (RustFSClient): RustFS client.
        """
        self.db = db
        self.current_user = current_user
        self.storage = storage

    def list_categories(self) -> list[ExpenseCategoryOut]:
        """
        List the seeded category tree in the owner's order.

        Returns:
            list[ExpenseCategoryOut]: Categories and sub-categories.
        """
        rows = self.db.scalars(select(ExpenseCategory).order_by(ExpenseCategory.type, ExpenseCategory.position))
        return [ExpenseCategoryOut.model_validate(row, from_attributes=True) for row in rows]

    def page_expenses(self, site_ids: list[UUID], period: str, category_id: str | None, search: str, offset: int, limit: int) -> tuple[list[ExpenseOut], int]:
        """
        Read one page of the register, newest first, filtered by period, category (or sub-category) and text.

        Args:
            site_ids (list[UUID]): Sites to read.
            period (str): Period.
            category_id (str | None): A category or a sub-category.
            search (str): Supplier, description, code or invoice number.
            offset (int): First row.
            limit (int): Rows per page.

        Returns:
            tuple[list[ExpenseOut], int]: The page and the list's size.
        """
        query = self._filter(site_ids, *get_period_range(self.db, period), category_id, search).order_by(Expense.date.desc(), Expense.created_at.desc(), Expense.id)
        total = self.db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
        return build_expense_views(self.db, self.storage, list(self.db.scalars(query.offset(offset).limit(limit)))), total or 0

    def list_for_export(self, site_ids: list[UUID], starts_on: date, ends_on: date) -> list[ExpenseOut]:
        """
        List the Expenses of a date range for the accountant's export, oldest first, cancelled ones included.

        Args:
            site_ids (list[UUID]): Sites to read.
            starts_on (date): First day.
            ends_on (date): Last day.

        Returns:
            list[ExpenseOut]: The Expenses.
        """
        query = self._filter(site_ids, starts_on, ends_on, None, "").order_by(Expense.date, Expense.code)
        return build_expense_views(self.db, self.storage, list(self.db.scalars(query)))

    def get_summary(self, site_ids: list[UUID], period: str) -> ExpenseSummaryOut:
        """
        Total the period's Expenses by category, cancelled ones left out, Investments apart; TVA derived as TTC × rate / (100 + rate).

        Args:
            site_ids (list[UUID]): Sites to read.
            period (str): Period.

        Returns:
            ExpenseSummaryOut: The summary.
        """
        scoped = resolve_site_ids(self.db, self.current_user, site_ids)
        starts_on, ends_on = get_period_range(self.db, period)
        vat = func.coalesce(Expense.amount * Expense.vat_rate / (100 + Expense.vat_rate), 0)
        rows = self.db.execute(
            select(ExpenseCategory.parent_id, func.sum(Expense.amount), func.sum(vat), func.count())
            .join(ExpenseCategory, ExpenseCategory.id == Expense.category_id)
            .where(Expense.site_id.in_(scoped), Expense.status == ExpenseStatus.RECORDED, Expense.date >= starts_on, Expense.date <= ends_on)
            .group_by(ExpenseCategory.parent_id)
        ).all()
        by_category = [ExpenseCategoryTotalOut(category_id=category_id, amount=float(amount)) for category_id, amount, _, _ in rows]
        total = sum((amount for _, amount, _, _ in rows), Decimal(0))
        investments = sum((amount for category_id, amount, _, _ in rows if category_id == INVESTMENT_CATEGORY_ID), Decimal(0))
        return ExpenseSummaryOut(total=float(total), operating=float(total - investments), investments=float(investments), vat=round(float(sum((row[2] for row in rows), Decimal(0))), 2), count=sum(row[3] for row in rows), by_category=sorted(by_category, key=lambda item: -item.amount))

    def get_expense(self, expense_id: UUID) -> ExpenseOut:
        """
        Read one Expense.

        Args:
            expense_id (UUID): Expense.

        Returns:
            ExpenseOut: The Expense.

        Raises:
            RefusedError: expense_not_found, site_forbidden.
        """
        return build_expense_views(self.db, self.storage, [self._get_expense(expense_id)])[0]

    def create_expense(self, payload: ExpenseIn) -> ExpenseOut:
        """
        Enter an Expense in the Season open on its date, with its code and invoices; a replay answers the Expense already saved.

        Args:
            payload (ExpenseIn): The Expense.

        Returns:
            ExpenseOut: The Expense as saved.

        Raises:
            RefusedError: expenses_forbidden, category_invalid, vat_rate_invalid, ice_invalid, date_in_future, season_not_open, season_closed.
        """
        existing = self.db.get(Expense, payload.id)
        if existing is not None:
            return build_expense_views(self.db, self.storage, [existing])[0]
        self._require(payload.site_id)
        season = self._check(payload)
        expense = Expense(id=payload.id, code=give_next_code(self.db, self.db.get(Site, payload.site_id), season, CodeKind.EXPENSE), site_id=payload.site_id, season_id=season.id, created_by_id=self.current_user.id)
        self._fill(expense, payload)
        self.db.add(expense)
        self.db.flush()
        self._sync_documents(expense, payload)
        record_audit_event(self.db, self.current_user.id, EXPENSE_CREATED_ACTION, site_id=expense.site_id, entity_type="expense", entity_id=expense.id, after={"code": expense.code, "amount": payload.amount, "categoryId": payload.category_id})
        self.db.commit()
        return build_expense_views(self.db, self.storage, [expense])[0]

    def update_expense(self, expense_id: UUID, payload: ExpenseIn) -> ExpenseOut:
        """
        Correct an Expense until its Season closes; the change is audited.

        Args:
            expense_id (UUID): Expense.
            payload (ExpenseIn): The corrected Expense.

        Returns:
            ExpenseOut: The Expense as saved.

        Raises:
            RefusedError: expense_not_found, expenses_forbidden, expense_cancelled, season_closed, and the checks of creation.
        """
        expense = self._get_expense(expense_id)
        self._require(expense.site_id)
        if expense.status == ExpenseStatus.CANCELLED:
            raise RefusedError("expense_cancelled")
        self._check_not_frozen(expense.season_id)
        season = self._check(payload)
        before = {"amount": float(expense.amount), "date": expense.date.isoformat(), "categoryId": expense.category_id}
        expense.season_id = season.id
        self._fill(expense, payload)
        expense.updated_by_id = self.current_user.id
        self._sync_documents(expense, payload)
        record_audit_event(self.db, self.current_user.id, EXPENSE_UPDATED_ACTION, site_id=expense.site_id, entity_type="expense", entity_id=expense.id, before=before, after={"amount": payload.amount, "date": payload.date.isoformat(), "categoryId": payload.category_id})
        self.db.commit()
        return build_expense_views(self.db, self.storage, [expense])[0]

    def cancel_expense(self, expense_id: UUID, payload: ExpenseCancelIn) -> ExpenseOut:
        """
        Cancel an Expense with a reason: it stays, struck through, out of every total; a repeat answers it as it is.

        Args:
            expense_id (UUID): Expense.
            payload (ExpenseCancelIn): The reason.

        Returns:
            ExpenseOut: The cancelled Expense.

        Raises:
            RefusedError: expense_not_found, expenses_forbidden, season_closed.
        """
        expense = self._get_expense(expense_id)
        if expense.status == ExpenseStatus.CANCELLED:
            return build_expense_views(self.db, self.storage, [expense])[0]
        self._require(expense.site_id)
        self._check_not_frozen(expense.season_id)
        expense.status = ExpenseStatus.CANCELLED
        expense.cancel_reason = payload.reason.strip()
        expense.cancelled_at = datetime.now(timezone.utc)
        expense.cancelled_by_id = self.current_user.id
        record_audit_event(self.db, self.current_user.id, EXPENSE_CANCELLED_ACTION, site_id=expense.site_id, entity_type="expense", entity_id=expense.id, after={"reason": expense.cancel_reason})
        self.db.commit()
        return build_expense_views(self.db, self.storage, [expense])[0]

    def list_suppliers(self) -> list[SupplierOut]:
        """
        List every Supplier by name.

        Returns:
            list[SupplierOut]: The Suppliers.
        """
        return [map_supplier(supplier) for supplier in self.db.scalars(select(Supplier).order_by(Supplier.name))]

    def create_supplier(self, payload: SupplierIn) -> SupplierOut:
        """
        Add a Supplier; a name already known (ignoring case) gives back that Supplier.

        Args:
            payload (SupplierIn): The Supplier.

        Returns:
            SupplierOut: The Supplier.

        Raises:
            RefusedError: ice_invalid.
        """
        supplier = self._find_or_add_supplier(payload)
        self.db.commit()
        return map_supplier(supplier)

    def _find_or_add_supplier(self, payload: SupplierIn) -> Supplier:
        """
        Find a Supplier by id or by name ignoring case, or add it, in the caller's transaction.

        Args:
            payload (SupplierIn): The Supplier.

        Returns:
            Supplier: The Supplier, flushed.

        Raises:
            RefusedError: ice_invalid.
        """
        existing = self.db.get(Supplier, payload.id) or self.db.scalar(select(Supplier).where(func.lower(Supplier.name) == payload.name.strip().lower()))
        if existing is not None:
            return existing
        self._check_ice(payload.ice)
        supplier = Supplier(id=payload.id, name=payload.name.strip(), ice=payload.ice or None, tax_identifier=payload.tax_id or None, created_by_id=self.current_user.id)
        self.db.add(supplier)
        self.db.flush()
        return supplier

    def _filter(self, site_ids: list[UUID], starts_on: date, ends_on: date, category_id: str | None, search: str) -> object:
        """
        Build the register's query for Sites, dates, a category and a text.

        Returns:
            object: The select statement.
        """
        scoped = resolve_site_ids(self.db, self.current_user, site_ids)
        query = select(Expense).where(Expense.site_id.in_(scoped), Expense.date >= starts_on, Expense.date <= ends_on)
        if category_id:
            query = query.join(ExpenseCategory, ExpenseCategory.id == Expense.category_id).where(or_(ExpenseCategory.id == category_id, ExpenseCategory.parent_id == category_id))
        if search.strip():
            pattern = f"%{search.strip()}%"
            query = query.where(or_(Expense.supplier_name.ilike(pattern), Expense.description.ilike(pattern), Expense.code.ilike(pattern), Expense.invoice_number.ilike(pattern)))
        return query

    def _check(self, payload: ExpenseIn) -> Season:
        """
        Check what the register's rules ask of an Expense and find its Season.

        Args:
            payload (ExpenseIn): The Expense.

        Returns:
            Season: The Season open on its date.

        Raises:
            RefusedError: category_invalid, vat_rate_invalid, ice_invalid, date_in_future, season_not_open, season_closed.
        """
        category = self.db.get(ExpenseCategory, payload.category_id)
        if category is None or category.type != ExpenseCategoryType.SUBCATEGORY or not category.is_active:
            raise RefusedError("category_invalid", 422)
        if payload.vat_rate is not None and payload.vat_rate not in VAT_RATES:
            raise RefusedError("vat_rate_invalid", 422)
        self._check_ice(payload.supplier_ice)
        if payload.date > get_local_today():
            raise RefusedError("date_in_future", 422)
        season = get_season_on(self.db, payload.date)
        if season is None:
            raise RefusedError("season_not_open")
        self._check_not_frozen(season.id)
        return season

    def _check_not_frozen(self, season_id: UUID) -> None:
        """
        Refuse a change in a closed Season.

        Args:
            season_id (UUID): Season of the Expense.

        Raises:
            RefusedError: season_closed.
        """
        season = self.db.get(Season, season_id)
        if season is not None and season.status == SeasonStatus.CLOSED:
            raise RefusedError("season_closed")

    def _check_ice(self, ice: str) -> None:
        """
        Refuse an ICE that isn't 15 digits.

        Args:
            ice (str): ICE typed, possibly empty.

        Raises:
            RefusedError: ice_invalid.
        """
        if ice and (len(ice) != ICE_LENGTH or not ice.isdigit()):
            raise RefusedError("ice_invalid", 422)

    def _fill(self, expense: Expense, payload: ExpenseIn) -> None:
        """
        Copy the form's fields onto an Expense, creating its Supplier when only a name was typed.

        Args:
            expense (Expense): Expense to fill.
            payload (ExpenseIn): The form.
        """
        supplier = self.db.get(Supplier, payload.supplier_id) if payload.supplier_id else None
        if supplier is None:
            supplier = self._find_or_add_supplier(SupplierIn(id=payload.supplier_id or payload.id, name=payload.supplier, ice=payload.supplier_ice, tax_id=payload.supplier_if))
        expense.date = payload.date
        expense.category_id = payload.category_id
        expense.description = payload.description.strip()
        expense.amount = Decimal(str(payload.amount))
        expense.vat_rate = Decimal(payload.vat_rate) if payload.vat_rate is not None else None
        expense.supplier_id = supplier.id
        expense.supplier_name = payload.supplier.strip()
        expense.supplier_ice = payload.supplier_ice or None
        expense.supplier_tax_identifier = payload.supplier_if or None
        expense.invoice_number = payload.invoice_number or None
        expense.invoice_date = payload.invoice_date
        expense.paid_by = payload.paid_by
        expense.payment_reference = payload.payment_reference or None

    def _sync_documents(self, expense: Expense, payload: ExpenseIn) -> None:
        """
        Keep the invoices the form still lists, drop the others, and store the new ones in the private bucket.

        Args:
            expense (Expense): Expense proved.
            payload (ExpenseIn): The form's documents.
        """
        kept_ids = [document.id for document in payload.documents if document.id]
        self.db.execute(delete(ExpenseDocument).where(ExpenseDocument.expense_id == expense.id, ExpenseDocument.file_id.notin_(kept_ids)))
        known = set(self.db.scalars(select(ExpenseDocument.file_id).where(ExpenseDocument.expense_id == expense.id)))
        for document in payload.documents:
            if document.id in known or not document.url.startswith("data:"):
                continue
            file = store_private_file(self.db, self.storage, document.url, document.name, self.current_user.id)
            self.db.flush()
            self.db.add(ExpenseDocument(expense_id=expense.id, file_id=file.id, created_by_id=self.current_user.id))

    def _require(self, site_id: UUID) -> None:
        """
        Refuse a User without « Gérer les charges » on the Site.

        Args:
            site_id (UUID): Site of the Expense.

        Raises:
            RefusedError: expenses_forbidden.
        """
        if not self.current_user.has_permission(site_id, Permission.EXPENSE_RECORD):
            raise RefusedError("expenses_forbidden", 403)

    def _get_expense(self, expense_id: UUID) -> Expense:
        """
        Load an Expense the caller may see.

        Args:
            expense_id (UUID): Expense.

        Returns:
            Expense: The Expense.

        Raises:
            RefusedError: expense_not_found, site_forbidden.
        """
        expense = self.db.get(Expense, expense_id)
        if expense is None:
            raise RefusedError("expense_not_found", 404)
        resolve_site_ids(self.db, self.current_user, [expense.site_id])
        return expense


def map_supplier(supplier: Supplier) -> SupplierOut:
    """
    Shape a Supplier for the front.

    Args:
        supplier (Supplier): Row.

    Returns:
        SupplierOut: The Supplier.
    """
    return SupplierOut(id=supplier.id, name=supplier.name, ice=supplier.ice or "", tax_id=supplier.tax_identifier or "")


def get_expense_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user), storage: RustFSClient = Depends(get_rustfs_client)) -> ExpenseService:
    """
    Build the expense service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.
        storage (RustFSClient): Shared RustFS client.

    Returns:
        ExpenseService: Service bound to the session, actor and storage.
    """
    return ExpenseService(db, current_user, storage)
