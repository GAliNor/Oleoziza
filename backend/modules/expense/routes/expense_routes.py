from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response

from core.http_cache import REFERENCE_CACHE_CONTROL
from modules.expense.services.expense_services import ExpenseService, get_expense_service
from modules.expense.types.expense_types import ExpenseCancelIn, ExpenseCategoryOut, ExpenseIn, ExpenseOut, ExpensePageOut, ExpenseSummaryOut, SupplierIn, SupplierOut


router = APIRouter(tags=["expense"])

PAGE_SIZE = 25

MAX_PAGE_SIZE = 100


@router.get("/categories", response_model=list[ExpenseCategoryOut])
def list_categories(response: Response, expense_service: ExpenseService = Depends(get_expense_service)) -> list[ExpenseCategoryOut]:
    """
    List the seeded Expense Categories; reference data the browser keeps for a day.

    Args:
        response (Response): Answer whose cache header is set.
        expense_service (ExpenseService): Injected expense service.

    Returns:
        list[ExpenseCategoryOut]: Categories and sub-categories.
    """
    response.headers["Cache-Control"] = REFERENCE_CACHE_CONTROL
    return expense_service.list_categories()


@router.get("/expenses", response_model=ExpensePageOut)
def page_expenses(
    site_ids: list[UUID] = Query(default=[], alias="siteId"),
    period: str = "season",
    category: str | None = None,
    search: str = "",
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    expense_service: ExpenseService = Depends(get_expense_service),
) -> ExpensePageOut:
    """
    Read one page of the register.

    Args:
        site_ids (list[UUID]): Repeated siteId.
        period (str): Period.
        category (str | None): Category or sub-category.
        search (str): Text.
        offset (int): First row.
        limit (int): Rows per page.
        expense_service (ExpenseService): Injected expense service.

    Returns:
        ExpensePageOut: The page and its size.
    """
    items, total = expense_service.page_expenses(site_ids, period, category, search, offset, limit)
    return ExpensePageOut(items=items, total=total)


@router.get("/expenses/summary", response_model=ExpenseSummaryOut)
def get_summary(site_ids: list[UUID] = Query(default=[], alias="siteId"), period: str = "season", expense_service: ExpenseService = Depends(get_expense_service)) -> ExpenseSummaryOut:
    """
    Total the period's Expenses by category.

    Args:
        site_ids (list[UUID]): Repeated siteId.
        period (str): Period.
        expense_service (ExpenseService): Injected expense service.

    Returns:
        ExpenseSummaryOut: The summary.
    """
    return expense_service.get_summary(site_ids, period)


@router.get("/expenses/export", response_model=list[ExpenseOut])
def list_for_export(site_ids: list[UUID] = Query(default=[], alias="siteId"), starts_on: date = Query(alias="from"), ends_on: date = Query(alias="to"), expense_service: ExpenseService = Depends(get_expense_service)) -> list[ExpenseOut]:
    """
    List a date range's Expenses for the accountant's export.

    Args:
        site_ids (list[UUID]): Repeated siteId.
        starts_on (date): First day.
        ends_on (date): Last day.
        expense_service (ExpenseService): Injected expense service.

    Returns:
        list[ExpenseOut]: The Expenses, oldest first.
    """
    return expense_service.list_for_export(site_ids, starts_on, ends_on)


@router.get("/expenses/{expense_id}", response_model=ExpenseOut)
def get_expense(expense_id: UUID, expense_service: ExpenseService = Depends(get_expense_service)) -> ExpenseOut:
    """
    Read one Expense.

    Args:
        expense_id (UUID): Expense.
        expense_service (ExpenseService): Injected expense service.

    Returns:
        ExpenseOut: The Expense.
    """
    return expense_service.get_expense(expense_id)


@router.post("/expenses", response_model=ExpenseOut)
def create_expense(payload: ExpenseIn, expense_service: ExpenseService = Depends(get_expense_service)) -> ExpenseOut:
    """
    Enter an Expense (expense.record); a replay answers the same Expense.

    Args:
        payload (ExpenseIn): The Expense.
        expense_service (ExpenseService): Injected expense service.

    Returns:
        ExpenseOut: The Expense.
    """
    return expense_service.create_expense(payload)


@router.put("/expenses/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: UUID, payload: ExpenseIn, expense_service: ExpenseService = Depends(get_expense_service)) -> ExpenseOut:
    """
    Correct an Expense until its Season closes.

    Args:
        expense_id (UUID): Expense.
        payload (ExpenseIn): The corrected Expense.
        expense_service (ExpenseService): Injected expense service.

    Returns:
        ExpenseOut: The Expense.
    """
    return expense_service.update_expense(expense_id, payload)


@router.post("/expenses/{expense_id}/cancel", response_model=ExpenseOut)
def cancel_expense(expense_id: UUID, payload: ExpenseCancelIn, expense_service: ExpenseService = Depends(get_expense_service)) -> ExpenseOut:
    """
    Cancel an Expense with a reason.

    Args:
        expense_id (UUID): Expense.
        payload (ExpenseCancelIn): The reason.
        expense_service (ExpenseService): Injected expense service.

    Returns:
        ExpenseOut: The cancelled Expense.
    """
    return expense_service.cancel_expense(expense_id, payload)


@router.get("/suppliers", response_model=list[SupplierOut])
def list_suppliers(expense_service: ExpenseService = Depends(get_expense_service)) -> list[SupplierOut]:
    """
    List every Supplier.

    Args:
        expense_service (ExpenseService): Injected expense service.

    Returns:
        list[SupplierOut]: The Suppliers.
    """
    return expense_service.list_suppliers()


@router.post("/suppliers", response_model=SupplierOut)
def create_supplier(payload: SupplierIn, expense_service: ExpenseService = Depends(get_expense_service)) -> SupplierOut:
    """
    Add a Supplier, or give back the one with that name.

    Args:
        payload (SupplierIn): The Supplier.
        expense_service (ExpenseService): Injected expense service.

    Returns:
        SupplierOut: The Supplier.
    """
    return expense_service.create_supplier(payload)
