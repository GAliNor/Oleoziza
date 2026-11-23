from calendar import monthrange
from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session
from uuid_utils.compat import uuid7

from modules.expense.models.expense_models import Expense, RecurringExpense
from modules.expense.types.expense_types import ExpenseFrequency, ExpensePaymentState


MONTHS_BY_FREQUENCY: dict[ExpenseFrequency, int] = {ExpenseFrequency.MONTHLY: 1, ExpenseFrequency.QUARTERLY: 3, ExpenseFrequency.YEARLY: 12}


def add_months(day: date, months: int, day_of_month: int) -> date:
    """
    Move a date by whole months on a day of the month, or the month's last day when it is shorter.

    Args:
        day (date): Starting date.
        months (int): Months to add.
        day_of_month (int): Day aimed at (31 gives 28 or 29 February, then 31 March).

    Returns:
        date: The date reached.
    """
    month_index = day.year * 12 + day.month - 1 + months
    year, month = divmod(month_index, 12)
    return date(year, month + 1, min(day_of_month, monthrange(year, month + 1)[1]))


def get_next_occurrence_on(recurrence: RecurringExpense) -> date:
    """
    Find the due date after the last occurrence created.

    Args:
        recurrence (RecurringExpense): The Recurring Expense.

    Returns:
        date: The next due date.
    """
    return add_months(recurrence.last_occurrence_on, MONTHS_BY_FREQUENCY[recurrence.frequency], recurrence.first_due_on.day)


def create_next_occurrence(db: Session, recurrence: RecurringExpense, model: Expense, actor_id: UUID | None = None) -> Expense | None:
    """
    Add the next Expense to pay of a Recurring Expense, copied from an earlier one: same kind, Supplier and amount, due on the next date.

    Args:
        db (Session): Session of the change, uncommitted.
        recurrence (RecurringExpense): The Recurring Expense, locked by the caller.
        model (Expense): Occurrence copied.
        actor_id (UUID | None): Who brought it about, None for the scheduled task.

    Returns:
        Expense | None: The new Expense, None when the recurrence was stopped.
    """
    if recurrence.stopped_at is not None:
        return None
    occurrence_on = get_next_occurrence_on(recurrence)
    expense = Expense(
        id=uuid7(),
        site_id=recurrence.site_id,
        payment_state=ExpensePaymentState.TO_PAY,
        due_on=occurrence_on,
        category_id=model.category_id,
        description=model.description,
        amount=model.amount,
        vat_rate=model.vat_rate,
        supplier_id=model.supplier_id,
        supplier_name=model.supplier_name,
        supplier_ice=model.supplier_ice,
        supplier_tax_identifier=model.supplier_tax_identifier,
        recurring_expense_id=recurrence.id,
        occurrence_on=occurrence_on,
        created_by_id=actor_id,
    )
    recurrence.last_occurrence_on = occurrence_on
    db.add(expense)
    db.flush()
    return expense


def lock_recurrence(db: Session, recurring_expense_id: UUID) -> RecurringExpense:
    """
    Load a Recurring Expense, held until the transaction ends, so two payments at once never create two next occurrences.

    Args:
        db (Session): Session of the change.
        recurring_expense_id (UUID): The Recurring Expense.

    Returns:
        RecurringExpense: The row, locked.
    """
    return db.scalars(select(RecurringExpense).where(RecurringExpense.id == recurring_expense_id).with_for_update().execution_options(populate_existing=True)).one()


def get_latest_occurrence(db: Session, recurring_expense_id: UUID) -> Expense | None:
    """
    Find the last occurrence of a Recurring Expense still there.

    Args:
        db (Session): Session to read with.
        recurring_expense_id (UUID): The Recurring Expense.

    Returns:
        Expense | None: The occurrence with the latest due date.
    """
    return db.scalar(select(Expense).where(Expense.recurring_expense_id == recurring_expense_id).order_by(Expense.occurrence_on.desc()).limit(1))


def create_due_occurrences(db: Session, today: date) -> int:
    """
    Add every occurrence whose due date has come while the one before was still unpaid; running it twice adds nothing twice.

    Args:
        db (Session): Session of the change, uncommitted.
        today (date): Today in Morocco.

    Returns:
        int: Occurrences added.
    """
    added = 0
    for recurring_expense_id in db.scalars(select(RecurringExpense.id).where(RecurringExpense.stopped_at.is_(None))).all():
        recurrence = lock_recurrence(db, recurring_expense_id)
        model = get_latest_occurrence(db, recurring_expense_id)
        while model is not None and recurrence.stopped_at is None and get_next_occurrence_on(recurrence) <= today:
            model = create_next_occurrence(db, recurrence, model)
            added += 1
    return added
