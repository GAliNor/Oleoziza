from modules.user.types.user_types import Permission, Role


OPERATOR_DEFAULT_PERMISSIONS: tuple[Permission, ...] = (
    Permission.RECEPTION_CREATE,
    Permission.LOT_UPDATE_STATUS,
    Permission.PRESSING_CREATE,
    Permission.WITHDRAWAL_CREATE,
    Permission.CLIENT_VIEW,
    Permission.CLIENT_CREATE,
    Permission.CLIENT_EDIT,
    Permission.PURCHASE_CREATE,
)

ACCOUNTANT_DEFAULT_PERMISSIONS: tuple[Permission, ...] = (
    Permission.FINANCE_VIEW,
    Permission.CLIENT_VIEW,
    Permission.PAYMENT_RECORD,
    Permission.PAYMENT_CONFIRM,
    Permission.PAYMENT_CANCEL,
    Permission.DOCUMENT_ADD,
    Permission.REFUND_MANAGE,
    Permission.DISCOUNT_GIVE,
    Permission.DEBT_FOLLOW,
    Permission.EXPENSE_RECORD,
)

ROLE_DEFAULT_PERMISSIONS: dict[Role, tuple[Permission, ...]] = {
    Role.MANAGEMENT: tuple(Permission),
    Role.OPERATOR: OPERATOR_DEFAULT_PERMISSIONS,
    Role.ACCOUNTANT: ACCOUNTANT_DEFAULT_PERMISSIONS,
    Role.CLIENT: (),
}
