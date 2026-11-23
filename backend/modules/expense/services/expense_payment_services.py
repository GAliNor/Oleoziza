from datetime import datetime, timezone
from uuid import UUID

from fastapi import Depends
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.helpers import get_local_today
from core.integrations.rustfs.rustfs_client import RustFSClient, get_rustfs_client
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.audit.models.audit_models import AuditEvent
from modules.expense.business.expense_due import IS_TO_PAY
from modules.expense.business.expense_rules import check_not_locked, get_payment_season, to_amount
from modules.expense.business.expense_views import build_expense_views
from modules.expense.business.recurrences import create_due_occurrences, create_next_occurrence, lock_recurrence
from modules.expense.models.expense_models import Expense, ExpenseDocument, RecurringExpense
from modules.expense.services.expense_services import ExpenseService
from modules.expense.types.expense_types import ExpenseActionIn, ExpenseOut, ExpensePayIn, ExpensePaymentState, ExpenseStatus
from modules.site.business.code_sequences import give_next_code
from modules.site.models.site_models import Site
from modules.site.types.site_types import CodeKind


EXPENSE_PAID_ACTION = "expense.paid"

EXPENSE_UNPAID_ACTION = "expense.unpaid"

EXPENSE_DELETED_ACTION = "expense.deleted"

RECURRENCE_STOPPED_ACTION = "expense.recurrence_stopped"


class ExpensePaymentService:
    def __init__(self, db: Session, current_user: CurrentUser, storage: RustFSClient) -> None:
        """
        Keep the session and the User following what is to pay.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
            storage (RustFSClient): RustFS client.
        """
        self.db = db
        self.current_user = current_user
        self.storage = storage
        self.expenses = ExpenseService(db, current_user, storage)

    def pay_expense(self, expense_id: UUID, payload: ExpensePayIn) -> ExpenseOut:
        """
        Mark an Expense paid: it gets its code and its Season, and a Recurring Expense its next occurrence. A replay answers it as it is.

        Args:
            expense_id (UUID): Expense to pay.
            payload (ExpensePayIn): Date, amount and way of paying.

        Returns:
            ExpenseOut: The Expense, paid.

        Raises:
            RefusedError: expense_not_found, expenses_forbidden, expense_cancelled, expense_already_paid, date_in_future, season_missing, season_closed.
        """
        expense = self._get_open(expense_id)
        if self.db.get(AuditEvent, payload.id) is not None:
            return self._build(expense)
        if expense.payment_state == ExpensePaymentState.PAID:
            raise RefusedError("expense_already_paid")
        season = get_payment_season(self.db, payload.date)
        expense.payment_state = ExpensePaymentState.PAID
        expense.date = payload.date
        expense.amount = to_amount(payload.amount)
        expense.paid_by = payload.paid_by
        expense.payment_reference = payload.payment_reference or None
        expense.season_id = season.id
        expense.code = expense.code or give_next_code(self.db, self.db.get(Site, expense.site_id), season, CodeKind.EXPENSE)
        expense.updated_by_id = self.current_user.id
        self._create_next_after(expense)
        after = {"code": expense.code, "amount": payload.amount, "date": payload.date.isoformat(), "categoryId": expense.category_id}
        record_audit_event(self.db, self.current_user.id, EXPENSE_PAID_ACTION, site_id=expense.site_id, entity_type="expense", entity_id=expense.id, after=after, event_id=payload.id)
        self.db.commit()
        return self._build(expense)

    def unpay_expense(self, expense_id: UUID, payload: ExpenseActionIn) -> ExpenseOut:
        """
        Put an Expense marked paid by mistake back to pay, until its Season locks it; it keeps its code.

        Args:
            expense_id (UUID): Expense.
            payload (ExpenseActionIn): The action's id.

        Returns:
            ExpenseOut: The Expense, to pay.

        Raises:
            RefusedError: expense_not_found, expenses_forbidden, expense_cancelled, season_closed.
        """
        expense = self._get_open(expense_id)
        if self.db.get(AuditEvent, payload.id) is not None or expense.payment_state == ExpensePaymentState.TO_PAY:
            return self._build(expense)
        check_not_locked(self.db, expense)
        before = {"amount": float(expense.amount), "date": expense.date.isoformat(), "categoryId": expense.category_id}
        expense.due_on = expense.due_on or expense.date
        expense.payment_state = ExpensePaymentState.TO_PAY
        expense.date = None
        expense.paid_by = None
        expense.payment_reference = None
        expense.season_id = None
        expense.updated_by_id = self.current_user.id
        record_audit_event(self.db, self.current_user.id, EXPENSE_UNPAID_ACTION, site_id=expense.site_id, entity_type="expense", entity_id=expense.id, before=before, event_id=payload.id)
        self.db.commit()
        return self._build(expense)

    def delete_expense(self, expense_id: UUID) -> None:
        """
        Really delete an Expense still to pay: no money moved. A Recurring Expense skips to its next occurrence.

        Args:
            expense_id (UUID): Expense to pay.

        Raises:
            RefusedError: expense_not_found, expenses_forbidden, expense_cancelled, expense_already_paid.
        """
        expense = self._get_open(expense_id)
        if expense.payment_state == ExpensePaymentState.PAID:
            raise RefusedError("expense_already_paid")
        self._create_next_after(expense)
        self._delete(expense)
        self.db.commit()

    def stop_recurrence(self, expense_id: UUID, payload: ExpenseActionIn) -> ExpenseOut | None:
        """
        Stop a Recurring Expense: its next occurrence not due yet goes, the paid and the late ones stay.

        Args:
            expense_id (UUID): One of its occurrences.
            payload (ExpenseActionIn): The action's id.

        Returns:
            ExpenseOut | None: The occurrence asked from, None when it was the one removed.

        Raises:
            RefusedError: expense_not_found, expenses_forbidden, expense_cancelled, expense_not_recurring.
        """
        expense = self._get_open(expense_id)
        if expense.recurring_expense_id is None:
            raise RefusedError("expense_not_recurring")
        recurrence = lock_recurrence(self.db, expense.recurring_expense_id)
        if recurrence.stopped_at is not None:
            return self._build(expense)
        self._stop(recurrence, expense, payload.id)
        is_gone = expense.payment_state == ExpensePaymentState.TO_PAY and expense.due_on > get_local_today()
        for upcoming in self.db.scalars(select(Expense).where(Expense.recurring_expense_id == recurrence.id, IS_TO_PAY, Expense.due_on > get_local_today())).all():
            self._delete(upcoming, is_told=False)
        self.db.commit()
        return None if is_gone else self._build(expense)

    def _stop(self, recurrence: RecurringExpense, expense: Expense, event_id: UUID) -> None:
        """
        Mark a Recurring Expense stopped and record it.

        Args:
            recurrence (RecurringExpense): The Recurring Expense, locked.
            expense (Expense): Occurrence it is stopped from.
            event_id (UUID): The action's id.
        """
        recurrence.stopped_at = datetime.now(timezone.utc)
        recurrence.updated_by_id = self.current_user.id
        after = {"categoryId": expense.category_id, "amount": float(expense.amount) if expense.amount is not None else None, "supplier": expense.supplier_name}
        record_audit_event(self.db, self.current_user.id, RECURRENCE_STOPPED_ACTION, site_id=expense.site_id, entity_type="expense", entity_id=expense.id, after=after, event_id=event_id)

    def _create_next_after(self, expense: Expense) -> None:
        """
        Add the next occurrence when an Expense is the last one of its Recurring Expense.

        Args:
            expense (Expense): Occurrence paid or skipped.
        """
        if expense.recurring_expense_id is None:
            return
        recurrence = lock_recurrence(self.db, expense.recurring_expense_id)
        if recurrence.last_occurrence_on == expense.occurrence_on:
            create_next_occurrence(self.db, recurrence, expense, self.current_user.id)

    def _delete(self, expense: Expense, is_told: bool = True) -> None:
        """
        Delete an Expense and its documents, keeping in the Audit Trail what it was.

        Args:
            expense (Expense): Expense to pay.
            is_told (bool): Whether the Journal tells this deletion.
        """
        before = {"code": expense.code, "amount": float(expense.amount) if expense.amount is not None else None, "categoryId": expense.category_id, "supplier": expense.supplier_name, "dueOn": expense.due_on.isoformat()}
        if is_told:
            record_audit_event(self.db, self.current_user.id, EXPENSE_DELETED_ACTION, site_id=expense.site_id, entity_type="expense", entity_id=expense.id, before=before)
        self.db.execute(delete(ExpenseDocument).where(ExpenseDocument.expense_id == expense.id))
        self.db.delete(expense)
        self.db.flush()

    def _get_open(self, expense_id: UUID) -> Expense:
        """
        Load an Expense the caller may change, refusing a cancelled one.

        Args:
            expense_id (UUID): Expense.

        Returns:
            Expense: The Expense.

        Raises:
            RefusedError: expense_not_found, site_forbidden, expenses_forbidden, expense_cancelled.
        """
        expense = self.expenses.get_expense_row(expense_id)
        self.expenses.require_right(expense.site_id)
        if expense.status == ExpenseStatus.CANCELLED:
            raise RefusedError("expense_cancelled")
        return expense

    def _build(self, expense: Expense) -> ExpenseOut:
        """
        Shape one Expense for the front.

        Args:
            expense (Expense): Expense.

        Returns:
            ExpenseOut: The Expense.
        """
        return build_expense_views(self.db, self.storage, [expense])[0]


class RecurrenceScheduleService:
    def __init__(self, db: Session) -> None:
        """
        Keep the session of the scheduled task.

        Args:
            db (Session): Session of the task.
        """
        self.db = db

    def create_due(self) -> int:
        """
        Add the occurrences whose due date has come while the one before is unpaid.

        Returns:
            int: Occurrences added.
        """
        added = create_due_occurrences(self.db, get_local_today())
        self.db.commit()
        return added


def get_expense_payment_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user), storage: RustFSClient = Depends(get_rustfs_client)) -> ExpensePaymentService:
    """
    Build the expense payment service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.
        storage (RustFSClient): Shared RustFS client.

    Returns:
        ExpensePaymentService: Service bound to the session, actor and storage.
    """
    return ExpensePaymentService(db, current_user, storage)
