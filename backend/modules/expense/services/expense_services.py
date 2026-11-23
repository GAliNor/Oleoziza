from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import Depends
from sqlalchemy import Select, delete, func, or_, select
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.helpers import get_local_today
from core.integrations.rustfs.rustfs_client import RustFSClient, get_rustfs_client
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.expense.business.expense_due import IS_TO_PAY, sum_to_pay
from modules.expense.business.expense_rules import check_expense, check_not_locked, get_payment_season, to_amount
from modules.expense.business.expense_summary import build_expense_summary, sum_expenses_by_subcategory
from modules.expense.business.expense_views import build_expense_views, build_snapshot
from modules.expense.business.recurrences import create_next_occurrence, lock_recurrence
from modules.expense.business.suppliers import find_or_add_supplier
from modules.expense.models.expense_models import Expense, ExpenseCategory, ExpenseDocument, RecurringExpense, Supplier
from modules.expense.types.expense_types import ExpenseCancelIn, ExpenseCategoryOut, ExpenseIn, ExpenseOut, ExpensePaymentState, ExpenseStatus, ExpenseSummaryOut, SupplierIn
from modules.file.business.private_files import store_private_file
from modules.site.business.code_sequences import give_next_code
from modules.site.business.season_lookup import get_period_range
from modules.site.business.site_scope import resolve_site_ids
from modules.site.models.site_models import Site
from modules.site.types.site_types import CodeKind
from modules.user.types.user_types import Permission


EXPENSE_CREATED_ACTION = "expense.entered"

EXPENSE_PLANNED_ACTION = "expense.planned"

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
        return build_expense_views(self.db, self.storage, [self.get_expense_row(expense_id)])[0]

    def page_expenses(self, site_ids: list[UUID], period: str, category_id: str | None, search: str, payment_state: ExpensePaymentState, offset: int, limit: int) -> tuple[list[ExpenseOut], int]:
        """
        Read one page of the register, filtered by category (or sub-category) and text: what was paid in the period, newest first, or all that is still to pay, most urgent first.

        Args:
            site_ids (list[UUID]): Sites to read.
            period (str): Period, for paid Expenses.
            category_id (str | None): A category or a sub-category.
            search (str): Supplier, description, code or invoice number.
            payment_state (ExpensePaymentState): Paid, or to pay.
            offset (int): First row.
            limit (int): Rows per page.

        Returns:
            tuple[list[ExpenseOut], int]: The page and the list's size.
        """
        query = self._filter(site_ids, category_id, search)
        if payment_state == ExpensePaymentState.TO_PAY:
            query = query.where(IS_TO_PAY).order_by(Expense.due_on, Expense.id)
        else:
            starts_on, ends_on = get_period_range(self.db, period)
            query = query.where(Expense.date >= starts_on, Expense.date <= ends_on).order_by(Expense.date.desc(), Expense.created_at.desc(), Expense.id)
        total = self.db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
        return build_expense_views(self.db, self.storage, list(self.db.scalars(query.offset(offset).limit(limit)))), total or 0

    def list_for_export(self, site_ids: list[UUID], starts_on: date, ends_on: date) -> list[ExpenseOut]:
        """
        List the Expenses paid in a date range for the accountant's export, oldest first, cancelled ones included.

        Args:
            site_ids (list[UUID]): Sites to read.
            starts_on (date): First day.
            ends_on (date): Last day.

        Returns:
            list[ExpenseOut]: The Expenses.
        """
        query = self._filter(site_ids, None, "").where(Expense.date >= starts_on, Expense.date <= ends_on).order_by(Expense.date, Expense.code)
        return build_expense_views(self.db, self.storage, list(self.db.scalars(query)))

    def get_summary(self, site_ids: list[UUID], period: str) -> ExpenseSummaryOut:
        """
        Total the Expenses paid in the period by sub-category and by category, cancelled ones left out, Investments apart, with what is still to pay.

        Args:
            site_ids (list[UUID]): Sites to read.
            period (str): Period.

        Returns:
            ExpenseSummaryOut: The summary.
        """
        scoped = resolve_site_ids(self.db, self.current_user, site_ids)
        starts_on, ends_on = get_period_range(self.db, period)
        return build_expense_summary(sum_expenses_by_subcategory(self.db, scoped, starts_on, ends_on), sum_to_pay(self.db, scoped, get_local_today()))

    def create_expense(self, payload: ExpenseIn) -> ExpenseOut:
        """
        Enter an Expense, to pay or already paid, recurring or not; a replay answers the Expense already saved.

        Args:
            payload (ExpenseIn): The Expense.

        Returns:
            ExpenseOut: The Expense as saved.

        Raises:
            RefusedError: expenses_forbidden, category_invalid, vat_rate_invalid, ice_invalid, due_date_required, payment_incomplete, date_in_future, season_missing, season_closed.
        """
        existing = self.db.get(Expense, payload.id)
        if existing is not None:
            return build_expense_views(self.db, self.storage, [existing])[0]
        self.require_right(payload.site_id)
        check_expense(self.db, payload, payload.payment_state)
        expense = Expense(id=payload.id, site_id=payload.site_id, payment_state=payload.payment_state, created_by_id=self.current_user.id)
        if payload.payment_state == ExpensePaymentState.PAID:
            season = get_payment_season(self.db, payload.date)
            expense.season_id = season.id
            expense.code = give_next_code(self.db, self.db.get(Site, payload.site_id), season, CodeKind.EXPENSE)
        self._fill(expense, payload)
        self.db.add(expense)
        self.db.flush()
        self._sync_documents(expense, payload)
        self._set_frequency(expense, payload)
        action = EXPENSE_CREATED_ACTION if payload.payment_state == ExpensePaymentState.PAID else EXPENSE_PLANNED_ACTION
        record_audit_event(self.db, self.current_user.id, action, site_id=expense.site_id, entity_type="expense", entity_id=expense.id, after={"code": expense.code, "amount": payload.amount, "categoryId": payload.category_id, "supplier": expense.supplier_name})
        self.db.commit()
        return build_expense_views(self.db, self.storage, [expense])[0]

    def update_expense(self, expense_id: UUID, payload: ExpenseIn) -> ExpenseOut:
        """
        Correct an Expense, until its Season locks it once paid; paying it, or putting it back to pay, is another action.

        Args:
            expense_id (UUID): Expense.
            payload (ExpenseIn): The corrected Expense.

        Returns:
            ExpenseOut: The Expense as saved.

        Raises:
            RefusedError: expense_not_found, expenses_forbidden, expense_cancelled, and the checks of creation.
        """
        expense = self.get_expense_row(expense_id)
        self.require_right(expense.site_id)
        if expense.status == ExpenseStatus.CANCELLED:
            raise RefusedError("expense_cancelled")
        check_not_locked(self.db, expense)
        check_expense(self.db, payload, expense.payment_state)
        before = build_snapshot(expense)
        if expense.payment_state == ExpensePaymentState.PAID:
            expense.season_id = get_payment_season(self.db, payload.date).id
        self._fill(expense, payload)
        expense.updated_by_id = self.current_user.id
        self._sync_documents(expense, payload)
        self._set_frequency(expense, payload)
        record_audit_event(self.db, self.current_user.id, EXPENSE_UPDATED_ACTION, site_id=expense.site_id, entity_type="expense", entity_id=expense.id, before=before, after=build_snapshot(expense))
        self.db.commit()
        return build_expense_views(self.db, self.storage, [expense])[0]

    def cancel_expense(self, expense_id: UUID, payload: ExpenseCancelIn) -> ExpenseOut:
        """
        Cancel a paid Expense with a reason: it stays, struck through, out of every total; a repeat answers it as it is. One still to pay is deleted instead.

        Args:
            expense_id (UUID): Expense.
            payload (ExpenseCancelIn): The reason.

        Returns:
            ExpenseOut: The cancelled Expense.

        Raises:
            RefusedError: expense_not_found, expenses_forbidden, expense_not_paid, season_closed.
        """
        expense = self.get_expense_row(expense_id)
        if expense.status == ExpenseStatus.CANCELLED:
            return build_expense_views(self.db, self.storage, [expense])[0]
        self.require_right(expense.site_id)
        if expense.payment_state == ExpensePaymentState.TO_PAY:
            raise RefusedError("expense_not_paid")
        check_not_locked(self.db, expense)
        expense.status = ExpenseStatus.CANCELLED
        expense.cancel_reason = payload.reason.strip()
        expense.cancelled_at = datetime.now(timezone.utc)
        expense.cancelled_by_id = self.current_user.id
        record_audit_event(self.db, self.current_user.id, EXPENSE_CANCELLED_ACTION, site_id=expense.site_id, entity_type="expense", entity_id=expense.id, after={"reason": expense.cancel_reason})
        self.db.commit()
        return build_expense_views(self.db, self.storage, [expense])[0]

    def get_expense_row(self, expense_id: UUID) -> Expense:
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

    def require_right(self, site_id: UUID) -> None:
        """
        Refuse a User without « Gérer les charges » on the Site.

        Args:
            site_id (UUID): Site of the Expense.

        Raises:
            RefusedError: expenses_forbidden.
        """
        if not self.current_user.has_permission(site_id, Permission.EXPENSE_RECORD):
            raise RefusedError("expenses_forbidden", 403)

    def _filter(self, site_ids: list[UUID], category_id: str | None, search: str) -> Select:
        """
        Build the register's query for Sites, a category and a text.

        Returns:
            Select: The select statement.
        """
        scoped = resolve_site_ids(self.db, self.current_user, site_ids)
        query = select(Expense).where(Expense.site_id.in_(scoped))
        if category_id:
            query = query.join(ExpenseCategory, ExpenseCategory.id == Expense.category_id).where(or_(ExpenseCategory.id == category_id, ExpenseCategory.parent_id == category_id))
        if search.strip():
            pattern = f"%{search.strip()}%"
            query = query.where(or_(Expense.supplier_name.ilike(pattern), Expense.description.ilike(pattern), Expense.code.ilike(pattern), Expense.invoice_number.ilike(pattern)))
        return query

    def _fill(self, expense: Expense, payload: ExpenseIn) -> None:
        """
        Copy the form's fields onto an Expense, creating its Supplier when only a name was typed; payment fields only count once paid.

        Args:
            expense (Expense): Expense to fill.
            payload (ExpenseIn): The form.
        """
        supplier = self._find_supplier(payload)
        is_paid = expense.payment_state == ExpensePaymentState.PAID
        expense.date = payload.date if is_paid else None
        expense.due_on = payload.due_on
        expense.category_id = payload.category_id
        expense.description = payload.description.strip() or None
        expense.amount = to_amount(payload.amount)
        expense.vat_rate = Decimal(payload.vat_rate) if payload.vat_rate is not None else None
        expense.supplier_id = supplier.id if supplier else None
        expense.supplier_name = (payload.supplier.strip() or supplier.name) if supplier else None
        expense.supplier_ice = payload.supplier_ice or None
        expense.supplier_tax_identifier = payload.supplier_if or None
        expense.invoice_number = payload.invoice_number or None
        expense.invoice_date = payload.invoice_date
        expense.paid_by = payload.paid_by if is_paid else None
        expense.payment_reference = (payload.payment_reference or None) if is_paid else None

    def _find_supplier(self, payload: ExpenseIn) -> Supplier | None:
        """
        Find the Supplier picked, or add the one typed; none is fine.

        Args:
            payload (ExpenseIn): The form.

        Returns:
            Supplier | None: The Supplier.
        """
        if payload.supplier_id and (supplier := self.db.get(Supplier, payload.supplier_id)):
            return supplier
        if not payload.supplier.strip():
            return None
        return find_or_add_supplier(self.db, SupplierIn(id=payload.supplier_id or payload.id, name=payload.supplier, ice=payload.supplier_ice, tax_id=payload.supplier_if), self.current_user.id)

    def _set_frequency(self, expense: Expense, payload: ExpenseIn) -> None:
        """
        Make an Expense recurring, or change how often it comes back; stopping it is another action. One entered already paid gets its next occurrence at once.

        Args:
            expense (Expense): Expense, flushed.
            payload (ExpenseIn): The form.
        """
        if payload.frequency is None:
            return
        if expense.recurring_expense_id is not None:
            recurrence = lock_recurrence(self.db, expense.recurring_expense_id)
            recurrence.frequency = payload.frequency
            recurrence.stopped_at = None
            return
        first_due_on = expense.due_on or expense.date
        recurrence = RecurringExpense(site_id=expense.site_id, frequency=payload.frequency, first_due_on=first_due_on, last_occurrence_on=first_due_on, created_by_id=self.current_user.id)
        self.db.add(recurrence)
        self.db.flush()
        expense.recurring_expense_id = recurrence.id
        expense.occurrence_on = first_due_on
        if expense.payment_state == ExpensePaymentState.PAID:
            create_next_occurrence(self.db, recurrence, expense, self.current_user.id)

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
