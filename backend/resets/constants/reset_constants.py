from modules.site.types.site_types import CodeKind
from resets.types.reset_types import ResetModule, ResetScope


SCOPES: dict[ResetModule, ResetScope] = {
    ResetModule.CHARGES: ResetScope(
        label="Charges and Suppliers",
        tables=("expenses", "recurring_expenses", "expense_documents", "suppliers"),
        code_kinds=(CodeKind.EXPENSE,),
    ),
    ResetModule.LOTS: ResetScope(
        label="Lots and oil",
        tables=("lots", "box_occupancies", "pressing_pauses", "lot_photos", "notifications", "discounts", "rate_corrections", "storages", "storage_draws", "withdrawals", "withdrawal_lines"),
        needs=(ResetModule.FINANCES,),
        code_kinds=(CodeKind.LOT, CodeKind.WITHDRAWAL),
    ),
    ResetModule.FINANCES: ResetScope(
        label="Finances (Payments, Refunds, Credit Notes, debt follow-up)",
        tables=("payments", "payment_allocations", "payment_proofs", "refunds", "credit_notes", "credit_note_uses", "debt_contacts"),
        code_kinds=(CodeKind.PAYMENT, CodeKind.REFUND, CodeKind.PAYOUT),
    ),
    ResetModule.CLIENTS: ResetScope(
        label="Clients",
        tables=("clients", "client_contacts"),
        needs=(ResetModule.LOTS, ResetModule.FINANCES),
    ),
    ResetModule.CONFIGURATION: ResetScope(
        label="Configuration (prices, Payment Methods, notification channels, Boxes, Tanks, Press Lines)",
        tables=("site_settings", "payment_method_settings", "notification_channel_settings", "boxes", "tanks", "press_lines"),
        needs=(ResetModule.LOTS, ResetModule.FINANCES),
    ),
    ResetModule.SEASONS: ResetScope(
        label="Seasons, with their prices",
        tables=("seasons", "code_sequences", "site_settings"),
        needs=(ResetModule.LOTS, ResetModule.FINANCES, ResetModule.CHARGES),
    ),
    ResetModule.JOURNAL: ResetScope(label="Journal (the whole Audit Trail)", tables=("audit_events",)),
    ResetModule.ASSISTANT: ResetScope(label="Assistant Conversations (AI settings and usage kept)", tables=("assistant_conversations", "assistant_questions")),
    ResetModule.STAFF: ResetScope(label="Staff Users, Owners kept", tables=()),
}

KEPT_TABLES = frozenset({"sites", "provinces", "cities", "expense_categories", "olive_varieties", "season_illustrations", "ai_providers", "ai_models", "ai_feature_settings", "ai_calls", "ai_call_payloads"})

PARTLY_RESET_TABLES = frozenset({"users", "site_assignments", "site_assignment_permissions", "user_login_methods", "credentials", "invitations", "one_time_codes", "files"})

USER_CHILD_TABLES = ("site_assignment_permissions", "site_assignments", "user_login_methods", "credentials", "invitations", "one_time_codes")
