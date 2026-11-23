from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from core.exceptions import RefusedError
from core.helpers import get_local_today
from modules.expense.models.expense_models import Expense, ExpenseCategory
from modules.expense.types.expense_types import ICE_LENGTH, VAT_RATES, ExpenseCategoryType, ExpenseIn, ExpensePaymentState
from modules.site.business.season_lookup import get_season_of_day, is_day_locked
from modules.site.models.site_models import Season


def check_expense(db: Session, payload: ExpenseIn, payment_state: ExpensePaymentState) -> None:
    """
    Check what the register's rules ask of an Expense: a sub-category always, a due date to pay it, and date, amount and way of paying once paid.

    Args:
        db (Session): Session to read with.
        payload (ExpenseIn): The Expense.
        payment_state (ExpensePaymentState): Whether it is to pay or paid.

    Raises:
        RefusedError: category_invalid, vat_rate_invalid, ice_invalid, due_date_required, payment_incomplete.
    """
    category = db.get(ExpenseCategory, payload.category_id)
    if category is None or category.type != ExpenseCategoryType.SUBCATEGORY or not category.is_active:
        raise RefusedError("category_invalid", 422)
    if payload.vat_rate is not None and payload.vat_rate not in VAT_RATES:
        raise RefusedError("vat_rate_invalid", 422)
    check_ice(payload.supplier_ice)
    if payment_state == ExpensePaymentState.TO_PAY and payload.due_on is None:
        raise RefusedError("due_date_required", 422)
    if payment_state == ExpensePaymentState.PAID and (payload.date is None or payload.amount is None or payload.paid_by is None):
        raise RefusedError("payment_incomplete", 422)


def check_ice(ice: str) -> None:
    """
    Refuse an ICE that isn't 15 digits.

    Args:
        ice (str): ICE typed, possibly empty.

    Raises:
        RefusedError: ice_invalid.
    """
    if ice and (len(ice) != ICE_LENGTH or not ice.isdigit()):
        raise RefusedError("ice_invalid", 422)


def get_payment_season(db: Session, day: date) -> Season:
    """
    Find the Season a payment counts in: the last one started by that day, off-season days included; what a closed Season settled stays settled.

    Args:
        db (Session): Session to read with.
        day (date): Payment date.

    Returns:
        Season: The Season.

    Raises:
        RefusedError: date_in_future, season_missing while the app has no Season, season_closed.
    """
    if day > get_local_today():
        raise RefusedError("date_in_future", 422)
    season = get_season_of_day(db, day)
    if season is None:
        raise RefusedError("season_missing")
    if is_day_locked(season, day):
        raise RefusedError("season_closed")
    return season


def check_not_locked(db: Session, expense: Expense) -> None:
    """
    Refuse a change to an Expense its closed Season settled; one still to pay is never locked.

    Args:
        db (Session): Session to read with.
        expense (Expense): Expense.

    Raises:
        RefusedError: season_closed.
    """
    season = db.get(Season, expense.season_id) if expense.season_id else None
    if season is not None and expense.date is not None and is_day_locked(season, expense.date):
        raise RefusedError("season_closed")


def to_amount(amount: float | None) -> Decimal | None:
    """
    Turn a typed amount into money.

    Args:
        amount (float | None): Amount, unknown for some Expenses to pay.

    Returns:
        Decimal | None: The amount.
    """
    return Decimal(str(amount)) if amount is not None else None
