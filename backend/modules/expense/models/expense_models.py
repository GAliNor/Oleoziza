from datetime import date as CalendarDate
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, String, Text, text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from core.model_mixins import MONEY, NAME_LENGTH, PERCENT, REFERENCE_LENGTH, SLUG_LENGTH, ActiveMixin, AuditMixin, HumanCodeMixin, IdMixin, SlugIdMixin, TimestampMixin, build_enum_type
from modules.expense.types.expense_types import ICE_LENGTH, ExpenseCategoryType, ExpenseFrequency, ExpensePaidBy, ExpensePaymentState, ExpenseStatus, ExpenseVatNature


ACCOUNT_CODE_LENGTH = 10


class ExpenseCategory(SlugIdMixin, TimestampMixin, ActiveMixin, Base):
    """
    Reference data seeded with its slug as id: a category or one of its sub-categories, retired rather than deleted.
    """

    __tablename__ = "expense_categories"
    __table_args__ = (CheckConstraint("(type = 'category') = (parent_id IS NULL)", name="category_has_no_parent"),)

    type: Mapped[ExpenseCategoryType] = mapped_column(build_enum_type(ExpenseCategoryType, "expense_category_type"))
    parent_id: Mapped[str | None] = mapped_column(String(SLUG_LENGTH), ForeignKey("expense_categories.id"))
    position: Mapped[int]
    account_code: Mapped[str | None] = mapped_column(String(ACCOUNT_CODE_LENGTH))
    vat_nature: Mapped[ExpenseVatNature] = mapped_column(build_enum_type(ExpenseVatNature, "expense_vat_nature"))
    is_vat_never_deductible: Mapped[bool] = mapped_column(default=False, server_default="false")


class Supplier(IdMixin, AuditMixin, Base):
    """
    Someone the mill pays, shared by every Site; its name is unique ignoring case.
    """

    __tablename__ = "suppliers"
    __table_args__ = (Index("uq_suppliers_name_ignoring_case", text("lower(name)"), unique=True),)

    name: Mapped[str] = mapped_column(String(NAME_LENGTH))
    ice: Mapped[str | None] = mapped_column(String(ICE_LENGTH))
    tax_identifier: Mapped[str | None] = mapped_column(String(REFERENCE_LENGTH))


class RecurringExpense(IdMixin, AuditMixin, Base):
    """
    An Expense that comes back: how often, from which due date, and the last occurrence created. Each occurrence is an Expense; the next one copies the last.
    """

    __tablename__ = "recurring_expenses"

    site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"), index=True)
    frequency: Mapped[ExpenseFrequency] = mapped_column(build_enum_type(ExpenseFrequency, "recurring_expense_frequency"))
    first_due_on: Mapped[CalendarDate] = mapped_column(Date)
    last_occurrence_on: Mapped[CalendarDate] = mapped_column(Date)
    stopped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Expense(IdMixin, AuditMixin, HumanCodeMixin, Base):
    """
    Money one Site has to pay by due_on, then paid on date, in the Season that day counts in; its code is given when it is paid.
    """

    __tablename__ = "expenses"
    __table_args__ = (
        CheckConstraint("amount IS NULL OR amount > 0", name="amount_is_positive"),
        CheckConstraint("payment_state <> 'paid' OR (date IS NOT NULL AND amount IS NOT NULL AND paid_by IS NOT NULL AND season_id IS NOT NULL)", name="paid_is_complete"),
        CheckConstraint("payment_state <> 'to_pay' OR due_on IS NOT NULL", name="to_pay_has_due_date"),
        UniqueConstraint("recurring_expense_id", "occurrence_on"),
        CheckConstraint("vat_rate IS NULL OR vat_rate IN (0, 10, 20)", name="vat_rate_is_known"),
        CheckConstraint("status <> 'cancelled' OR (cancel_reason IS NOT NULL AND cancelled_at IS NOT NULL)", name="cancellation_has_reason"),
        Index("ix_expenses_site_date", "site_id", "date"),
        Index("ix_expenses_site_due_on", "site_id", "due_on", postgresql_where=text("payment_state = 'to_pay'")),
    )

    site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"))
    season_id: Mapped[UUID | None] = mapped_column(ForeignKey("seasons.id"))
    payment_state: Mapped[ExpensePaymentState] = mapped_column(build_enum_type(ExpensePaymentState, "expense_payment_state"), default=ExpensePaymentState.PAID, server_default=ExpensePaymentState.PAID.value)
    due_on: Mapped[CalendarDate | None] = mapped_column(Date)
    date: Mapped[CalendarDate | None] = mapped_column(Date)
    category_id: Mapped[str] = mapped_column(String(SLUG_LENGTH), ForeignKey("expense_categories.id"))
    description: Mapped[str | None] = mapped_column(Text)
    amount: Mapped[Decimal | None] = mapped_column(MONEY)
    vat_rate: Mapped[Decimal | None] = mapped_column(PERCENT)
    supplier_id: Mapped[UUID | None] = mapped_column(ForeignKey("suppliers.id"))
    supplier_name: Mapped[str | None] = mapped_column(String(NAME_LENGTH))
    supplier_ice: Mapped[str | None] = mapped_column(String(ICE_LENGTH))
    supplier_tax_identifier: Mapped[str | None] = mapped_column(String(REFERENCE_LENGTH))
    invoice_number: Mapped[str | None] = mapped_column(String(REFERENCE_LENGTH))
    invoice_date: Mapped[CalendarDate | None] = mapped_column(Date)
    paid_by: Mapped[ExpensePaidBy | None] = mapped_column(build_enum_type(ExpensePaidBy, "expense_paid_by"))
    payment_reference: Mapped[str | None] = mapped_column(String(REFERENCE_LENGTH))
    status: Mapped[ExpenseStatus] = mapped_column(build_enum_type(ExpenseStatus, "expense_status"), default=ExpenseStatus.RECORDED, server_default=ExpenseStatus.RECORDED.value)
    cancel_reason: Mapped[str | None] = mapped_column(Text)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    recurring_expense_id: Mapped[UUID | None] = mapped_column(ForeignKey("recurring_expenses.id"), index=True)
    occurrence_on: Mapped[CalendarDate | None] = mapped_column(Date)


class ExpenseDocument(IdMixin, AuditMixin, Base):
    """
    A photo or PDF of the invoice or receipt proving one Expense, stored as a File in RustFS.
    """

    __tablename__ = "expense_documents"

    expense_id: Mapped[UUID] = mapped_column(ForeignKey("expenses.id"))
    file_id: Mapped[UUID] = mapped_column(ForeignKey("files.id"))
