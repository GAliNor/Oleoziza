from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from modules.expense.business.expense_rules import check_ice
from modules.expense.models.expense_models import Supplier
from modules.expense.types.expense_types import SupplierIn


def find_or_add_supplier(db: Session, payload: SupplierIn, actor_id: UUID) -> Supplier:
    """
    Find a Supplier by id or by name ignoring case, or add it, in the caller's transaction.

    Args:
        db (Session): Session of the change.
        payload (SupplierIn): The Supplier.
        actor_id (UUID): User adding it.

    Returns:
        Supplier: The Supplier, flushed.

    Raises:
        RefusedError: ice_invalid.
    """
    existing = db.get(Supplier, payload.id) or db.scalar(select(Supplier).where(func.lower(Supplier.name) == payload.name.strip().lower()))
    if existing is not None:
        return existing
    check_ice(payload.ice)
    supplier = Supplier(id=payload.id, name=payload.name.strip(), ice=payload.ice or None, tax_identifier=payload.tax_id or None, created_by_id=actor_id)
    db.add(supplier)
    db.flush()
    return supplier
