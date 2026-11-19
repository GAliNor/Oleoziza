from collections import defaultdict
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from modules.expense.models.expense_models import Expense, ExpenseCategory
from modules.expense.types.expense_types import INVESTMENT_CATEGORY_ID, ExpenseCategoryTotalOut, ExpenseStatus, ExpenseSubcategoryTotalOut, ExpenseSummaryOut


def sum_expenses_by_subcategory(db: Session, site_ids: list[UUID], starts_on: date, ends_on: date) -> list[ExpenseSubcategoryTotalOut]:
    """
    Total the recorded Expenses of the Sites over a period per sub-category, cancelled ones left out, largest first; TVA derived as TTC × rate / (100 + rate).

    Args:
        db (Session): Session to read with.
        site_ids (list[UUID]): Sites to read.
        starts_on (date): First day of the period.
        ends_on (date): Last day of the period.

    Returns:
        list[ExpenseSubcategoryTotalOut]: One total per sub-category with spending.
    """
    vat = func.coalesce(Expense.amount * Expense.vat_rate / (100 + Expense.vat_rate), 0)
    rows = db.execute(
        select(Expense.category_id, ExpenseCategory.parent_id, func.sum(Expense.amount), func.sum(vat), func.count())
        .join(ExpenseCategory, ExpenseCategory.id == Expense.category_id)
        .where(Expense.site_id.in_(site_ids), Expense.status == ExpenseStatus.RECORDED, Expense.date >= starts_on, Expense.date <= ends_on)
        .group_by(Expense.category_id, ExpenseCategory.parent_id)
        .order_by(func.sum(Expense.amount).desc(), Expense.category_id)
    ).all()
    return [
        ExpenseSubcategoryTotalOut(category_id=category_id, parent_id=parent_id, amount=float(amount), vat=round(float(vat_amount), 2), count=count)
        for category_id, parent_id, amount, vat_amount, count in rows
    ]


def build_expense_summary(by_subcategory: list[ExpenseSubcategoryTotalOut]) -> ExpenseSummaryOut:
    """
    Roll sub-category totals up into the period's summary: totals per category, operating costs and Investments apart.

    Args:
        by_subcategory (list[ExpenseSubcategoryTotalOut]): The period's totals per sub-category.

    Returns:
        ExpenseSummaryOut: The summary, categories and sub-categories largest first.
    """
    amounts: dict[str, Decimal] = defaultdict(Decimal)
    counts: dict[str, int] = defaultdict(int)
    for row in by_subcategory:
        amounts[row.parent_id] += Decimal(str(row.amount))
        counts[row.parent_id] += row.count
    by_category = sorted((ExpenseCategoryTotalOut(category_id=category_id, amount=float(amount), count=counts[category_id]) for category_id, amount in amounts.items()), key=lambda item: (-item.amount, item.category_id))
    total = sum(amounts.values(), Decimal(0))
    investments = amounts.get(INVESTMENT_CATEGORY_ID, Decimal(0))
    vat = sum((Decimal(str(row.vat)) for row in by_subcategory), Decimal(0))
    return ExpenseSummaryOut(
        total=float(total),
        operating=float(total - investments),
        investments=float(investments),
        vat=round(float(vat), 2),
        count=sum(counts.values()),
        by_category=by_category,
        by_subcategory=by_subcategory,
    )
