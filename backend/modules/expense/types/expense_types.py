from datetime import date as CalendarDate
from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import Field

from core.types import CamelModel


class ExpenseCategoryType(StrEnum):
    """
    The two levels of the Expense Category tree: an Expense always points at a sub-category.
    """

    CATEGORY = "category"
    SUBCATEGORY = "subcategory"


class ExpenseVatNature(StrEnum):
    """
    How the TVA return files a cost (CGI art. 112-I-8°): a fixed asset, a good, a service, or outside TVA.
    """

    FIXED_ASSET = "fixed_asset"
    GOOD = "good"
    SERVICE = "service"
    NONE = "none"


class ExpensePaidBy(StrEnum):
    """
    How an Expense was paid: its own list, not the Client Payment Methods.
    """

    CASH = "cash"
    CHEQUE = "cheque"
    TRANSFER = "transfer"
    CARD = "card"


class ExpenseStatus(StrEnum):
    """
    Where an Expense stands; a cancelled one stays, out of every total.
    """

    RECORDED = "recorded"
    CANCELLED = "cancelled"


class ExpensePaymentState(StrEnum):
    """
    Whether an Expense is still to pay or paid; only paid ones count in totals, TVA and the export.
    """

    TO_PAY = "to_pay"
    PAID = "paid"


class ExpenseFrequency(StrEnum):
    """
    How often a Recurring Expense comes back.
    """

    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


INVESTMENT_CATEGORY_ID = "investment"

VAT_RATES = (0, 10, 20)

ICE_LENGTH = 15


class ExpenseCategoryOut(CamelModel):
    """
    One row of the seeded category tree; labels live in the front's locales by slug.
    """

    id: str
    type: ExpenseCategoryType
    parent_id: str | None
    position: int
    is_active: bool
    account_code: str | None
    vat_nature: ExpenseVatNature
    is_vat_never_deductible: bool


class SupplierOut(CamelModel):
    """
    Someone the mill pays.
    """

    id: UUID
    name: str
    ice: str
    tax_id: str


class SupplierIn(CamelModel):
    """
    A Supplier created from the Expense form; an existing name gives back that Supplier.
    """

    id: UUID
    name: str = Field(min_length=1, max_length=120)
    ice: str = Field(default="", max_length=15)
    tax_id: str = Field(default="", max_length=100)


class ExpenseDocumentIn(CamelModel):
    """
    An invoice photo or PDF: a new one as a data URL, or one already stored, by id.
    """

    id: UUID | None = None
    name: str = Field(default="document", max_length=255)
    url: str
    is_pdf: bool = False


class ExpenseIn(CamelModel):
    """
    An Expense as the form sends it; the id is minted when the form opens. One to pay needs its due date only, one paid its date, amount and way of paying.
    """

    id: UUID
    site_id: UUID
    payment_state: ExpensePaymentState = ExpensePaymentState.PAID
    due_on: CalendarDate | None = None
    frequency: ExpenseFrequency | None = None
    date: CalendarDate | None = None
    category_id: str
    description: str = ""
    amount: float | None = Field(default=None, gt=0)
    vat_rate: int | None = None
    supplier_id: UUID | None = None
    supplier: str = Field(default="", max_length=120)
    supplier_ice: str = Field(default="", max_length=15)
    supplier_if: str = Field(default="", max_length=100)
    invoice_number: str = Field(default="", max_length=100)
    invoice_date: CalendarDate | None = None
    paid_by: ExpensePaidBy | None = None
    payment_reference: str = Field(default="", max_length=100)
    documents: list[ExpenseDocumentIn] = []


class ExpensePayIn(CamelModel):
    """
    An Expense marked paid; the id is the action's Audit Event, so a replay never pays it twice.
    """

    id: UUID
    date: CalendarDate
    amount: float = Field(gt=0)
    paid_by: ExpensePaidBy
    payment_reference: str = Field(default="", max_length=100)


class ExpenseActionIn(CamelModel):
    """
    An action without details; the id is its Audit Event.
    """

    id: UUID


class ExpenseCancelIn(CamelModel):
    """
    Cancelling an Expense keeps it, struck through, with the reason.
    """

    reason: str = Field(min_length=1, max_length=500)


class ExpenseDocumentOut(CamelModel):
    """
    A stored invoice, read through a signed URL.
    """

    id: UUID
    name: str
    url: str
    is_pdf: bool
    added_by: str
    added_at: datetime


class ExpenseOut(CamelModel):
    """
    An Expense as the register, its detail and the export read it.
    """

    id: UUID
    code: str | None
    site_id: UUID
    season_id: UUID | None
    season_label: str | None
    is_locked: bool
    payment_state: ExpensePaymentState
    due_on: CalendarDate | None
    recurring_expense_id: UUID | None
    frequency: ExpenseFrequency | None
    date: CalendarDate | None
    category_id: str
    description: str
    amount: float | None
    vat_rate: int | None
    supplier_id: UUID | None
    supplier: str
    supplier_ice: str
    supplier_if: str
    invoice_number: str
    invoice_date: CalendarDate | None
    paid_by: ExpensePaidBy | None
    payment_reference: str
    documents: list[ExpenseDocumentOut]
    status: ExpenseStatus
    recorded_by: str
    recorded_at: datetime
    updated_by: str | None = None
    updated_at: datetime | None = None
    cancelled_by: str | None = None
    cancelled_at: datetime | None = None
    cancel_reason: str | None = None


class ExpensePageOut(CamelModel):
    """
    One page of the register, with its size.
    """

    items: list[ExpenseOut]
    total: int


class ExpenseCategoryTotalOut(CamelModel):
    """
    The period's total for one category, with how many Expenses make it.
    """

    category_id: str
    amount: float
    count: int


class ExpenseSubcategoryTotalOut(CamelModel):
    """
    The period's total for one sub-category (« Salaires », « Électricité »), with its category, its TVA and how many Expenses make it.
    """

    category_id: str
    parent_id: str
    amount: float
    vat: float
    count: int


class ExpenseToPayOut(CamelModel):
    """
    What is still to pay, whatever the period: how many, for how much, how many are late and how many have no amount yet.
    """

    count: int
    amount: float
    late_count: int
    unknown_amount_count: int


class ExpenseSummaryOut(CamelModel):
    """
    The period's paid Expenses, cancelled ones left out: operating costs and Investments apart; and what is still to pay.
    """

    to_pay: ExpenseToPayOut

    total: float
    operating: float
    investments: float
    vat: float
    count: int
    by_category: list[ExpenseCategoryTotalOut]
    by_subcategory: list[ExpenseSubcategoryTotalOut]
