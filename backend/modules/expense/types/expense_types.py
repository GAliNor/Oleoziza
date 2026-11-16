from enum import StrEnum


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


INVESTMENT_CATEGORY_ID = "investment"

VAT_RATES = (0, 10, 20)

ICE_LENGTH = 15
