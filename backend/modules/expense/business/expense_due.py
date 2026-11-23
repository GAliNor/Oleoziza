from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from modules.expense.models.expense_models import Expense, RecurringExpense
from modules.expense.types.expense_types import ExpenseFrequency, ExpensePaymentState, ExpenseStatus, ExpenseToPayOut


MONTHLY_NOTICE_IN_DAYS = 7

LONG_NOTICE_IN_DAYS = 30

LONG_NOTICE_FREQUENCIES = (ExpenseFrequency.QUARTERLY, ExpenseFrequency.YEARLY)

IS_TO_PAY = (Expense.payment_state == ExpensePaymentState.TO_PAY) & (Expense.status == ExpenseStatus.RECORDED)


def list_due_expenses(db: Session, site_ids: list[UUID], today: date) -> list[Expense]:
    """
    List the Expenses to pay worth an alert, most urgent first: 30 days ahead for a quarterly or yearly one, 7 days ahead for any other, and every late one.

    Args:
        db (Session): Session to read with.
        site_ids (list[UUID]): Sites to read.
        today (date): Today in Morocco.

    Returns:
        list[Expense]: The Expenses, by due date.
    """
    is_long_notice = RecurringExpense.frequency.in_(LONG_NOTICE_FREQUENCIES) & RecurringExpense.stopped_at.is_(None)
    query = (
        select(Expense)
        .outerjoin(RecurringExpense, RecurringExpense.id == Expense.recurring_expense_id)
        .where(Expense.site_id.in_(site_ids), IS_TO_PAY)
        .where(or_(Expense.due_on <= today + timedelta(days=MONTHLY_NOTICE_IN_DAYS), is_long_notice & (Expense.due_on <= today + timedelta(days=LONG_NOTICE_IN_DAYS))))
        .order_by(Expense.due_on, Expense.id)
    )
    return list(db.scalars(query))


def sum_to_pay(db: Session, site_ids: list[UUID], today: date) -> ExpenseToPayOut:
    """
    Total what is still to pay on the Sites, whatever the period.

    Args:
        db (Session): Session to read with.
        site_ids (list[UUID]): Sites to read.
        today (date): Today in Morocco.

    Returns:
        ExpenseToPayOut: Count, amount, late ones and those without an amount yet.
    """
    count, amount, known_count, late_count = db.execute(
        select(func.count(), func.coalesce(func.sum(Expense.amount), 0), func.count(Expense.amount), func.count().filter(Expense.due_on < today)).select_from(Expense).where(Expense.site_id.in_(site_ids), IS_TO_PAY)
    ).one()
    return ExpenseToPayOut(count=count, amount=float(amount), late_count=late_count, unknown_amount_count=count - known_count)
