from modules.assistant.business.semantic_formulas import (
    LOCAL_TODAY_SQL,
    build_client_name_sql,
    build_collected_sql,
    build_fee_sql,
    build_local_day_sql,
    build_outstanding_sql,
    build_pending_sql,
)
from modules.assistant.types.semantic_types import FieldKind, SemanticEntity, SemanticField, SemanticMeasure


LOT_MODES = ("service_milling", "purchase")

LOT_STATUSES = ("waiting", "pressing", "pressed", "withdrawn")

PAYMENT_METHODS = ("cash", "cheque", "transfer", "oil")

PAYMENT_STATUSES = ("pending", "confirmed", "rejected", "cancelled")

DISCOUNT_STATES = ("applied", "pending", "approved", "refused")

REFUND_STATUSES = ("to_make", "made", "confirmed")

CLIENT_KINDS = ("individual", "company")

RECEIVED_DAY_SQL = build_local_day_sql("l.entered_at")

LOT_ENTITY = SemanticEntity(
    name="lot",
    description="One Reception of a Client's olives: Service Milling (pressed for a fee) or Purchase (the mill buys them). Revenue, Collected, pending and Outstanding are counted on Lots at their reception date.",
    from_sql=(
        "lots l JOIN clients c ON c.id = l.client_id JOIN sites s ON s.id = l.site_id JOIN seasons se ON se.id = l.season_id "
        "JOIN olive_varieties v ON v.id = l.olive_variety_id LEFT JOIN press_lines pl ON pl.id = l.press_line_id"
    ),
    id_sql="l.id",
    label_sql="COALESCE(l.code, 'Lot')",
    site_sql="l.site_id",
    link_sql="'/operations?lot=' || l.id",
    default_date_field="received_date",
    references={"client": "client_id"},
    fields={
        "id": SemanticField("l.id", FieldKind.ID, "Lot id"),
        "code": SemanticField("l.code", FieldKind.TEXT, "Lot code on its Lot Ticket"),
        "mode": SemanticField("l.mode::text", FieldKind.ENUM, "service_milling or purchase", LOT_MODES),
        "status": SemanticField("l.status::text", FieldKind.ENUM, "waiting (not pressed yet), pressing, pressed, withdrawn", LOT_STATUSES),
        "client_id": SemanticField("c.id", FieldKind.ID, "Client id"),
        "client_name": SemanticField(build_client_name_sql("c"), FieldKind.TEXT, "Client name"),
        "site_name": SemanticField("s.name", FieldKind.TEXT, "Site (mill) name"),
        "season": SemanticField("se.label", FieldKind.TEXT, "Season label"),
        "variety": SemanticField("v.name", FieldKind.TEXT, "Olive variety"),
        "received_date": SemanticField(RECEIVED_DAY_SQL, FieldKind.DATE, "Reception day"),
        "received_month": SemanticField(f"TO_CHAR({RECEIVED_DAY_SQL}, 'YYYY-MM')", FieldKind.TEXT, "Reception month YYYY-MM"),
        "received_week": SemanticField(f"date_trunc('week', {RECEIVED_DAY_SQL})::date", FieldKind.DATE, "Monday of the reception week"),
        "net_weight_kg": SemanticField("l.net_weight_in_kg", FieldKind.KILOGRAMS, "Net olive weight"),
        "oil_litres": SemanticField("l.oil_in_litres", FieldKind.LITRES, "Oil obtained at Pressing"),
        "yield": SemanticField("ROUND(l.oil_in_litres / NULLIF(l.net_weight_in_kg / 100, 0), 1)", FieldKind.NUMBER, "Yield in litres per quintal"),
        "press_line_number": SemanticField("pl.number", FieldKind.NUMBER, "Press Line (Malaxeur) number"),
        "planned_start_date": SemanticField(build_local_day_sql("l.planned_start_at"), FieldKind.DATE, "Planned Pressing day"),
        "pressed_date": SemanticField(build_local_day_sql("l.pressing_ended_at"), FieldKind.DATE, "Day the Pressing ended"),
        "days_waiting": SemanticField(f"CASE WHEN l.status::text = 'waiting' THEN {LOCAL_TODAY_SQL} - {RECEIVED_DAY_SQL} END", FieldKind.DAYS, "Days since reception while not pressed yet"),
        "days_until_planned_start": SemanticField(f"{build_local_day_sql('l.planned_start_at')} - {LOCAL_TODAY_SQL}", FieldKind.DAYS, "Days left until the planned Pressing (negative when late)"),
        "milling_rate": SemanticField("l.milling_rate_per_kg", FieldKind.AMOUNT, "Milling Rate per kg", is_money=True),
        "daily_price": SemanticField("l.daily_price_per_kg", FieldKind.AMOUNT, "Purchase price per kg", is_money=True),
        "fee": SemanticField(build_fee_sql("l"), FieldKind.AMOUNT, "Milling Fee after Discount", is_money=True),
        "outstanding": SemanticField(build_outstanding_sql("l"), FieldKind.AMOUNT, "What the Lot still owes", is_money=True),
    },
    measures={
        "count": SemanticMeasure("COUNT(l.id)", FieldKind.NUMBER, "Number of Lots"),
        "client_count": SemanticMeasure("COUNT(DISTINCT l.client_id)", FieldKind.NUMBER, "Number of distinct Clients"),
        "net_weight_kg": SemanticMeasure("SUM(l.net_weight_in_kg)", FieldKind.KILOGRAMS, "Olives received"),
        "oil_litres": SemanticMeasure("SUM(l.oil_in_litres)", FieldKind.LITRES, "Oil produced"),
        "yield": SemanticMeasure("ROUND(SUM(l.oil_in_litres) / NULLIF(SUM(CASE WHEN l.oil_in_litres IS NOT NULL THEN l.net_weight_in_kg END) / 100, 0), 1)", FieldKind.NUMBER, "Average Yield, litres per quintal of pressed Lots"),
        "revenue": SemanticMeasure(f"SUM({build_fee_sql('l')})", FieldKind.AMOUNT, "Revenue (CA, chiffre d'affaires, turnover): Milling Fees after Discount", is_money=True),
        "collected": SemanticMeasure(f"SUM({build_collected_sql('l')})", FieldKind.AMOUNT, "Collected (encaissé)", is_money=True),
        "pending": SemanticMeasure(f"SUM({build_pending_sql('l')})", FieldKind.AMOUNT, "Payments awaiting confirmation (à confirmer)", is_money=True),
        "outstanding": SemanticMeasure(f"SUM({build_outstanding_sql('l')})", FieldKind.AMOUNT, "Outstanding (reste à encaisser, impayés)", is_money=True),
        "purchase_amount": SemanticMeasure("SUM(CASE WHEN l.mode::text = 'purchase' THEN l.net_weight_in_kg * COALESCE(l.daily_price_per_kg, 0) ELSE 0 END)", FieldKind.AMOUNT, "What the mill paid for olives it bought", is_money=True),
        "discount_amount": SemanticMeasure("SUM(COALESCE((SELECT SUM(d.amount) FROM discounts d WHERE d.lot_id = l.id AND d.state::text IN ('applied', 'approved')), 0))", FieldKind.AMOUNT, "Discounts granted", is_money=True),
        "average_days_waiting": SemanticMeasure(f"ROUND(AVG(CASE WHEN l.status::text = 'waiting' THEN {LOCAL_TODAY_SQL} - {RECEIVED_DAY_SQL} END), 1)", FieldKind.DAYS, "Average days waiting of Lots not pressed yet"),
    },
)

CLIENT_ENTITY = SemanticEntity(
    name="client",
    description="A Client (Individual or Company), shared across Sites; in scope when they brought a Lot to a Site in scope. Their figures come from lot grouped or filtered by client.",
    from_sql="clients c",
    id_sql="c.id",
    label_sql=build_client_name_sql("c"),
    site_sql="(SELECT lx.site_id FROM lots lx WHERE lx.client_id = c.id AND lx.site_id = ANY(CAST(:scope_site_ids AS uuid[])) LIMIT 1)",
    link_sql="'/clients/' || c.id",
    default_filters=(("status", "active"),),
    fields={
        "id": SemanticField("c.id", FieldKind.ID, "Client id"),
        "name": SemanticField(build_client_name_sql("c"), FieldKind.TEXT, "Client name"),
        "kind": SemanticField("c.kind::text", FieldKind.ENUM, "individual or company", CLIENT_KINDS),
        "status": SemanticField("c.status::text", FieldKind.ENUM, "active or merged", ("active", "merged")),
        "first_seen_date": SemanticField(build_local_day_sql("c.entered_at"), FieldKind.DATE, "Day the Client was first recorded"),
    },
    measures={"count": SemanticMeasure("COUNT(c.id)", FieldKind.NUMBER, "Number of Clients")},
)

PAYMENT_ENTITY = SemanticEntity(
    name="payment",
    description="Money (or oil) a Client paid at a Site. Defaults to confirmed Payments.",
    from_sql="payments p JOIN clients c ON c.id = p.client_id JOIN sites s ON s.id = p.site_id",
    id_sql="p.id",
    label_sql="COALESCE(p.code, 'Paiement')",
    site_sql="p.site_id",
    link_sql="'/finances'",
    default_date_field="received_date",
    default_filters=(("status", "confirmed"),),
    is_money=True,
    references={"client": "client_id"},
    fields={
        "id": SemanticField("p.id", FieldKind.ID, "Payment id"),
        "code": SemanticField("p.code", FieldKind.TEXT, "Payment code"),
        "method": SemanticField("p.method::text", FieldKind.ENUM, "Payment Method", PAYMENT_METHODS),
        "status": SemanticField("p.status::text", FieldKind.ENUM, "Payment state", PAYMENT_STATUSES),
        "amount": SemanticField("p.amount", FieldKind.AMOUNT, "Amount", is_money=True),
        "client_id": SemanticField("c.id", FieldKind.ID, "Client id"),
        "client_name": SemanticField(build_client_name_sql("c"), FieldKind.TEXT, "Client name"),
        "site_name": SemanticField("s.name", FieldKind.TEXT, "Site name"),
        "received_date": SemanticField(build_local_day_sql("p.entered_at"), FieldKind.DATE, "Day the Payment was taken"),
        "confirmed_date": SemanticField(build_local_day_sql("p.decided_at"), FieldKind.DATE, "Day it was confirmed or rejected"),
    },
    measures={
        "count": SemanticMeasure("COUNT(p.id)", FieldKind.NUMBER, "Number of Payments"),
        "amount_total": SemanticMeasure("SUM(p.amount)", FieldKind.AMOUNT, "Total paid", is_money=True),
    },
)

DISCOUNT_ENTITY = SemanticEntity(
    name="discount",
    description="A Discount given on a Lot's fee; pending ones await Management.",
    from_sql="discounts d JOIN lots l ON l.id = d.lot_id JOIN clients c ON c.id = l.client_id",
    id_sql="d.id",
    label_sql="COALESCE(l.code, 'Lot')",
    site_sql="l.site_id",
    link_sql="'/discounts'",
    default_date_field="given_date",
    is_money=True,
    fields={
        "lot_code": SemanticField("l.code", FieldKind.TEXT, "Lot code"),
        "client_name": SemanticField(build_client_name_sql("c"), FieldKind.TEXT, "Client name"),
        "state": SemanticField("d.state::text", FieldKind.ENUM, "Discount state", DISCOUNT_STATES),
        "percent": SemanticField("d.percent", FieldKind.NUMBER, "Percent of the fee"),
        "amount": SemanticField("d.amount", FieldKind.AMOUNT, "Amount", is_money=True),
        "given_date": SemanticField(build_local_day_sql("d.created_at"), FieldKind.DATE, "Day it was given"),
    },
    measures={
        "count": SemanticMeasure("COUNT(d.id)", FieldKind.NUMBER, "Number of Discounts"),
        "amount_total": SemanticMeasure("SUM(d.amount)", FieldKind.AMOUNT, "Total discounted", is_money=True),
    },
)

REFUND_ENTITY = SemanticEntity(
    name="refund",
    description="Money the mill gives back to a Client (an overpayment or a cancelled Payment).",
    from_sql="refunds r JOIN clients c ON c.id = r.client_id",
    id_sql="r.id",
    label_sql="COALESCE(r.code, 'Remboursement')",
    site_sql="r.site_id",
    link_sql="'/finances'",
    default_date_field="created_date",
    is_money=True,
    fields={
        "code": SemanticField("r.code", FieldKind.TEXT, "Refund code"),
        "client_name": SemanticField(build_client_name_sql("c"), FieldKind.TEXT, "Client name"),
        "status": SemanticField("r.status::text", FieldKind.ENUM, "to_make, made, confirmed", REFUND_STATUSES),
        "amount": SemanticField("r.amount", FieldKind.AMOUNT, "Amount", is_money=True),
        "created_date": SemanticField(build_local_day_sql("r.created_at"), FieldKind.DATE, "Day it was decided"),
    },
    measures={
        "count": SemanticMeasure("COUNT(r.id)", FieldKind.NUMBER, "Number of Refunds"),
        "amount_total": SemanticMeasure("SUM(r.amount)", FieldKind.AMOUNT, "Total refunded", is_money=True),
    },
)
