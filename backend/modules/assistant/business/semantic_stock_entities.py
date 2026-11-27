from modules.assistant.business.semantic_formulas import LOCAL_TODAY_SQL, build_client_name_sql, build_local_day_sql, build_storage_remaining_sql
from modules.assistant.types.semantic_types import FieldKind, SemanticEntity, SemanticField, SemanticMeasure


INVESTMENT_CATEGORY_SQL = "'investment'"

EXPENSE_CATEGORY_SQL = "COALESCE(ec.parent_id, ec.id)"

STORAGE_ENTITY = SemanticEntity(
    name="storage",
    description="Oil kept in a Tank for its owner (a Client's Oil Stock, or the mill's own oil), from a date and optionally until a planned date. Defaults to active Storages (oil still there).",
    from_sql=(
        "storages st JOIN tanks t ON t.id = st.tank_id JOIN lots l ON l.id = st.lot_id JOIN olive_varieties v ON v.id = l.olive_variety_id "
        "LEFT JOIN clients c ON c.id = st.client_id JOIN sites s ON s.id = t.site_id"
    ),
    id_sql="st.id",
    label_sql="COALESCE(l.code, 'Stockage')",
    site_sql="t.site_id",
    link_sql="'/operations?lot=' || l.id",
    default_filters=(("status", "active"),),
    references={"client": "client_id"},
    fields={
        "owner": SemanticField("st.owner::text", FieldKind.ENUM, "client or mill", ("client", "mill")),
        "status": SemanticField("CASE WHEN st.ended_at IS NULL THEN 'active' ELSE 'ended' END", FieldKind.ENUM, "active (oil still there) or ended", ("active", "ended")),
        "client_id": SemanticField("c.id", FieldKind.ID, "Client id"),
        "client_name": SemanticField(build_client_name_sql("c"), FieldKind.TEXT, "Client name (empty for the mill)"),
        "lot_code": SemanticField("l.code", FieldKind.TEXT, "Lot the oil came from"),
        "tank_number": SemanticField("t.number", FieldKind.NUMBER, "Tank (Cuve) number"),
        "site_name": SemanticField("s.name", FieldKind.TEXT, "Site name"),
        "variety": SemanticField("v.name", FieldKind.TEXT, "Olive variety"),
        "stored_date": SemanticField(build_local_day_sql("st.stored_from"), FieldKind.DATE, "Day the oil was poured"),
        "planned_until": SemanticField("st.planned_until", FieldKind.DATE, "Day the Client planned to take it back"),
        "days_until_planned_end": SemanticField(f"st.planned_until - {LOCAL_TODAY_SQL}", FieldKind.DAYS, "Days left until the planned end (negative when past)"),
        "days_stored": SemanticField(f"{LOCAL_TODAY_SQL} - {build_local_day_sql('st.stored_from')}", FieldKind.DAYS, "Days since the oil was poured"),
        "remaining_litres": SemanticField(build_storage_remaining_sql("st"), FieldKind.LITRES, "Litres still in the Tank"),
    },
    measures={
        "count": SemanticMeasure("COUNT(st.id)", FieldKind.NUMBER, "Number of Storages"),
        "remaining_litres": SemanticMeasure(f"SUM({build_storage_remaining_sql('st')})", FieldKind.LITRES, "Litres still stored (Oil Stock or Mill Stock)"),
        "stored_litres": SemanticMeasure("SUM(st.oil_in_litres)", FieldKind.LITRES, "Litres poured"),
    },
)

WITHDRAWAL_ENTITY = SemanticEntity(
    name="withdrawal",
    description="Oil leaving the mill with a Client or someone they send (handover = straight after Pressing).",
    from_sql="withdrawals w JOIN lots l ON l.id = w.lot_id JOIN clients c ON c.id = l.client_id JOIN sites s ON s.id = w.site_id",
    id_sql="w.id",
    label_sql="COALESCE(w.code, l.code, 'Retrait')",
    site_sql="w.site_id",
    link_sql="'/operations?lot=' || l.id",
    default_date_field="withdrawn_date",
    fields={
        "code": SemanticField("w.code", FieldKind.TEXT, "Withdrawal code"),
        "kind": SemanticField("w.kind::text", FieldKind.ENUM, "handover or withdrawal", ("handover", "withdrawal")),
        "lot_code": SemanticField("l.code", FieldKind.TEXT, "Lot code"),
        "client_name": SemanticField(build_client_name_sql("c"), FieldKind.TEXT, "Client name"),
        "taken_by": SemanticField("w.taken_by_name", FieldKind.TEXT, "Who took the oil"),
        "site_name": SemanticField("s.name", FieldKind.TEXT, "Site name"),
        "withdrawn_date": SemanticField(build_local_day_sql("w.entered_at"), FieldKind.DATE, "Day of the Withdrawal"),
        "litres": SemanticField("(SELECT SUM(wl.container_in_litres * wl.container_count) FROM withdrawal_lines wl WHERE wl.withdrawal_id = w.id)", FieldKind.LITRES, "Litres taken"),
    },
    measures={
        "count": SemanticMeasure("COUNT(w.id)", FieldKind.NUMBER, "Number of Withdrawals"),
        "litres": SemanticMeasure("SUM((SELECT SUM(wl.container_in_litres * wl.container_count) FROM withdrawal_lines wl WHERE wl.withdrawal_id = w.id))", FieldKind.LITRES, "Litres taken"),
    },
)

TANK_ENTITY = SemanticEntity(
    name="tank",
    description="A numbered Tank (Cuve) of a Site, in service, with its capacity and the oil it holds now.",
    from_sql="tanks t JOIN sites s ON s.id = t.site_id",
    id_sql="t.id",
    label_sql="'Cuve ' || t.number",
    site_sql="t.site_id",
    default_filters=(("in_service", "yes"),),
    fields={
        "number": SemanticField("t.number", FieldKind.NUMBER, "Tank number"),
        "site_name": SemanticField("s.name", FieldKind.TEXT, "Site name"),
        "in_service": SemanticField("CASE WHEN t.retired_at IS NULL THEN 'yes' ELSE 'no' END", FieldKind.ENUM, "yes or no (retired)", ("yes", "no")),
        "capacity_litres": SemanticField("t.capacity_in_litres", FieldKind.LITRES, "Capacity"),
        "filled_litres": SemanticField(f"COALESCE((SELECT SUM({build_storage_remaining_sql('st')}) FROM storages st WHERE st.tank_id = t.id AND st.ended_at IS NULL), 0)", FieldKind.LITRES, "Litres in it now"),
        "free_litres": SemanticField(f"t.capacity_in_litres - COALESCE((SELECT SUM({build_storage_remaining_sql('st')}) FROM storages st WHERE st.tank_id = t.id AND st.ended_at IS NULL), 0)", FieldKind.LITRES, "Room left"),
    },
    measures={
        "count": SemanticMeasure("COUNT(t.id)", FieldKind.NUMBER, "Number of Tanks"),
        "capacity_litres": SemanticMeasure("SUM(t.capacity_in_litres)", FieldKind.LITRES, "Total capacity"),
        "filled_litres": SemanticMeasure("SUM(COALESCE((SELECT SUM(st.oil_in_litres - COALESCE((SELECT SUM(dr.oil_in_litres) FROM storage_draws dr WHERE dr.storage_id = st.id AND NOT dr.is_reversed), 0)) FROM storages st WHERE st.tank_id = t.id AND st.ended_at IS NULL), 0))", FieldKind.LITRES, "Litres stored"),
    },
)

EXPENSE_ENTITY = SemanticEntity(
    name="expense",
    description="An Expense (charge) of a Site, by category; Investments are a category of their own. Defaults to recorded (not cancelled) Expenses. Result = lot.revenue − expense.operating_amount over paid Expenses.",
    from_sql="expenses e JOIN expense_categories ec ON ec.id = e.category_id JOIN sites s ON s.id = e.site_id LEFT JOIN suppliers sup ON sup.id = e.supplier_id",
    id_sql="e.id",
    label_sql="COALESCE(e.description, e.code, e.category_id)",
    site_sql="e.site_id",
    link_sql="'/charges'",
    default_date_field="date",
    default_filters=(("status", "recorded"),),
    is_money=True,
    fields={
        "code": SemanticField("e.code", FieldKind.TEXT, "Expense code"),
        "category": SemanticField(EXPENSE_CATEGORY_SQL, FieldKind.TEXT, "Category id: staff, energy, maintenance, premises, transport, administration, compliance, commercial, miscellaneous, stock_purchase, investment"),
        "subcategory": SemanticField("e.category_id", FieldKind.TEXT, "Sub-category id"),
        "description": SemanticField("e.description", FieldKind.TEXT, "Description"),
        "supplier": SemanticField("COALESCE(e.supplier_name, sup.name)", FieldKind.TEXT, "Supplier name"),
        "site_name": SemanticField("s.name", FieldKind.TEXT, "Site name"),
        "date": SemanticField("e.date", FieldKind.DATE, "Day it was paid or incurred"),
        "due_date": SemanticField("e.due_on", FieldKind.DATE, "Day it is due"),
        "days_until_due": SemanticField(f"e.due_on - {LOCAL_TODAY_SQL}", FieldKind.DAYS, "Days left until due (negative when late)"),
        "payment_state": SemanticField("e.payment_state::text", FieldKind.ENUM, "to_pay or paid", ("to_pay", "paid")),
        "status": SemanticField("e.status::text", FieldKind.ENUM, "recorded or cancelled", ("recorded", "cancelled")),
        "amount": SemanticField("e.amount", FieldKind.AMOUNT, "Amount (TTC)", is_money=True),
    },
    measures={
        "count": SemanticMeasure("COUNT(e.id)", FieldKind.NUMBER, "Number of Expenses"),
        "amount_total": SemanticMeasure("SUM(e.amount)", FieldKind.AMOUNT, "Total of every Expense", is_money=True),
        "operating_amount": SemanticMeasure(f"SUM(CASE WHEN {EXPENSE_CATEGORY_SQL} <> {INVESTMENT_CATEGORY_SQL} THEN e.amount ELSE 0 END)", FieldKind.AMOUNT, "Operating costs: every Expense except Investments", is_money=True),
        "investment_amount": SemanticMeasure(f"SUM(CASE WHEN {EXPENSE_CATEGORY_SQL} = {INVESTMENT_CATEGORY_SQL} THEN e.amount ELSE 0 END)", FieldKind.AMOUNT, "Investments", is_money=True),
    },
)
