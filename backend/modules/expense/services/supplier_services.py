from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from core.types import CurrentUser
from modules.expense.business.suppliers import find_or_add_supplier
from modules.expense.models.expense_models import Supplier
from modules.expense.types.expense_types import SupplierIn, SupplierOut


class SupplierService:
    def __init__(self, db: Session, current_user: CurrentUser) -> None:
        """
        Keep the session and the User reading or adding Suppliers.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
        """
        self.db = db
        self.current_user = current_user

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
        supplier = find_or_add_supplier(self.db, payload, self.current_user.id)
        self.db.commit()
        return map_supplier(supplier)


def map_supplier(supplier: Supplier) -> SupplierOut:
    """
    Shape a Supplier for the front.

    Args:
        supplier (Supplier): Row.

    Returns:
        SupplierOut: The Supplier.
    """
    return SupplierOut(id=supplier.id, name=supplier.name, ice=supplier.ice or "", tax_id=supplier.tax_identifier or "")


def get_supplier_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)) -> SupplierService:
    """
    Build the supplier service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.

    Returns:
        SupplierService: Service bound to the session and actor.
    """
    return SupplierService(db, current_user)
