from collections import defaultdict
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.integrations.rustfs.rustfs_client import RustFSClient
from modules.expense.models.expense_models import Expense, ExpenseDocument
from modules.expense.types.expense_types import ExpenseDocumentOut, ExpenseOut
from modules.file.models.file_models import File
from modules.lot.business.lot_views import list_user_names


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
    for expense_id, file in rows:
        documents[expense_id].append(ExpenseDocumentOut(id=file.id, name=file.original_name, url=storage.build_signed_url(file.storage_key), is_pdf=file.content_type == "application/pdf", added_by=names.get(file.created_by_id, "") if file.created_by_id else "", added_at=file.created_at))
    return [
        ExpenseOut(
            id=expense.id,
            code=expense.code,
            site_id=expense.site_id,
            date=expense.date,
            category_id=expense.category_id,
            description=expense.description,
            amount=float(expense.amount),
            vat_rate=int(expense.vat_rate) if expense.vat_rate is not None else None,
            supplier_id=expense.supplier_id,
            supplier=expense.supplier_name,
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
