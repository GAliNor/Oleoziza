from enum import StrEnum


class Role(StrEnum):
    """
    The four fixed kinds of User; the Role gives the starting Workspace and the default Permissions.
    """

    MANAGEMENT = "management"
    OPERATOR = "operator"
    ACCOUNTANT = "accountant"
    CLIENT = "client"


class Permission(StrEnum):
    """
    The fixed catalogue of rights a staff User can hold on a Site.
    """

    RECEPTION_CREATE = "reception.create"
    LOT_UPDATE_STATUS = "lot.update_status"
    LOT_SET_PRICE = "lot.set_price"
    PRESSING_CREATE = "pressing.create"
    WITHDRAWAL_CREATE = "withdrawal.create"
    CLIENT_VIEW = "client.view"
    CLIENT_CREATE = "client.create"
    CLIENT_EDIT = "client.edit"
    CLIENT_MANAGE_ACCESS = "client.manage_access"
    PAYMENT_RECORD = "payment.record"
    PAYOUT_RECORD = "payout.record"
    PAYMENT_CONFIRM = "payment.confirm"
    PAYMENT_CANCEL = "payment.cancel"
    DOCUMENT_ADD = "document.add"
    REFUND_MANAGE = "refund.manage"
    DISCOUNT_GIVE = "discount.give"
    DISCOUNT_APPROVE = "discount.approve"
    DEBT_FOLLOW = "debt.follow"
    RECORD_CORRECT = "record.correct"
    EXPENSE_RECORD = "expense.record"
    PURCHASE_CREATE = "purchase.create"
    SALE_CREATE = "sale.create"
    DAILY_PRICE_SET = "daily_price.set"
    PRODUCT_MANAGE = "product.manage"
    FINANCE_VIEW = "finance.view"
    STOCK_VIEW = "stock.view"
    USER_MANAGE = "user.manage"
    SITE_MANAGE = "site.manage"
    SEASON_MANAGE = "season.manage"
    AUDIT_TRAIL_VIEW = "audit_trail.view"
    DASHBOARD_VIEW = "dashboard.view"
    CONFIGURATION_MANAGE = "configuration.manage"


class Title(StrEnum):
    """
    The courtesy title printed before a person's name.
    """

    M = "m"
    MME = "mme"
    DR = "dr"
    PR = "pr"
    ME = "me"
    HAJJ = "hajj"
    HAJJA = "hajja"


class Language(StrEnum):
    """
    The language a User reads the app in.
    """

    FR = "fr"
    AR = "ar"


class LoginMethod(StrEnum):
    """
    A way a User is allowed to log in.
    """

    PHONE_PIN = "phone_pin"
    EMAIL_PASSWORD = "email_password"
    PHONE_OTP = "phone_otp"


class UserStatus(StrEnum):
    """
    Where a User's account stands; an account is disabled, never deleted.
    """

    INVITED = "invited"
    ACTIVE = "active"
    DISABLED = "disabled"
