from collections import defaultdict
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.integrations.rustfs.rustfs_client import RustFSClient
from modules.expense.models.expense_models import Expense, ExpenseDocument, RecurringExpense
from modules.expense.types.expense_types import ExpenseDocumentOut, ExpenseOut
from modules.file.models.file_models import File
from modules.lot.business.lot_views import list_user_names
from modules.site.business.season_lookup import is_day_locked
from modules.site.models.site_models import Season


def build_expense_views(db: Session, storage: RustFSClient, expenses: list[Expense]) -> list[ExpenseOut]:
    """
    Shape many Expenses for the register in a fixed number of queries: invoices with signed URLs and the names of who entered, changed or cancelled them.

    Args:
        db (Session): Session to read with.
        storage (RustFSClient): RustFS client, to sign the invoices' URLs.
        expenses (list[Expense]): Expense rows.

    Returns:
        list[ExpenseOut]: The Expenses in the same order.
    """
    if not expenses:
        return []
    documents: dict[UUID, list[ExpenseDocumentOut]] = defaultdict(list)
    rows = db.execute(select(ExpenseDocument.expense_id, File).join(File, File.id == ExpenseDocument.file_id).where(ExpenseDocument.expense_id.in_([expense.id for expense in expenses]))).all()
    user_ids = {user_id for expense in expenses for user_id in (expense.created_by_id, expense.updated_by_id, expense.cancelled_by_id) if user_id}
    names = list_user_names(db, user_ids | {file.created_by_id for _, file in rows if file.created_by_id})
    seasons = {season.id: season for season in db.scalars(select(Season).where(Season.id.in_({expense.season_id for expense in expenses if expense.season_id})))}
    recurring_ids = {expense.recurring_expense_id for expense in expenses if expense.recurring_expense_id}
    frequencies = dict(db.execute(select(RecurringExpense.id, RecurringExpense.frequency).where(RecurringExpense.id.in_(recurring_ids), RecurringExpense.stopped_at.is_(None))).all()) if recurring_ids else {}
    for expense_id, file in rows:
        documents[expense_id].append(ExpenseDocumentOut(id=file.id, name=file.original_name, url=storage.build_signed_url(file.storage_key), is_pdf=file.content_type == "application/pdf", added_by=names.get(file.created_by_id, "") if file.created_by_id else "", added_at=file.created_at))
    return [
        ExpenseOut(
            id=expense.id,
            code=expense.code,
            site_id=expense.site_id,
            season_id=expense.season_id,
            season_label=seasons[expense.season_id].label if expense.season_id in seasons else None,
            is_locked=expense.date is not None and expense.season_id in seasons and is_day_locked(seasons[expense.season_id], expense.date),
            payment_state=expense.payment_state,
            due_on=expense.due_on,
            recurring_expense_id=expense.recurring_expense_id,
            frequency=frequencies.get(expense.recurring_expense_id),
            date=expense.date,
            category_id=expense.category_id,
            description=expense.description or "",
            amount=float(expense.amount) if expense.amount is not None else None,
            vat_rate=int(expense.vat_rate) if expense.vat_rate is not None else None,
            supplier_id=expense.supplier_id,
            supplier=expense.supplier_name or "",
            supplier_ice=expense.supplier_ice or "",
            supplier_if=expense.supplier_tax_identifier or "",
            invoice_number=expense.invoice_number or "",
            invoice_date=expense.invoice_date,
            paid_by=expense.paid_by,
            payment_reference=expense.payment_reference or "",
            documents=documents.get(expense.id, []),
            status=expense.status,
            recorded_by=names.get(expense.created_by_id, "") if expense.created_by_id else "",
            recorded_at=expense.created_at,
            updated_by=names.get(expense.updated_by_id) if expense.updated_by_id else None,
            updated_at=expense.updated_at if expense.updated_by_id else None,
            cancelled_by=names.get(expense.cancelled_by_id) if expense.cancelled_by_id else None,
            cancelled_at=expense.cancelled_at,
            cancel_reason=expense.cancel_reason,
        )
        for expense in expenses
    ]


def build_snapshot(expense: Expense) -> dict:
    """
    Keep what the Audit Trail compares of an Expense.

    Args:
        expense (Expense): Expense.

    Returns:
        dict: Amount, dates, category and Supplier.
    """
    return {
        "amount": float(expense.amount) if expense.amount is not None else None,
        "date": expense.date.isoformat() if expense.date else None,
        "dueOn": expense.due_on.isoformat() if expense.due_on else None,
        "categoryId": expense.category_id,
        "supplier": expense.supplier_name,
    }
