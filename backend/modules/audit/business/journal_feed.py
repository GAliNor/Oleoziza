from datetime import date, datetime, time, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.helpers import APP_TIME_ZONE
from modules.audit.models.audit_models import AuditEvent
from modules.audit.types.audit_types import MONEY_GROUPS, ActivityKind, GROUP_BY_KIND, JournalEventOut
from modules.client.models.client_models import Client
from modules.configuration.models.configuration_models import OliveVariety
from modules.expense.models.expense_models import Expense
from modules.finance.models.finance_models import Payment, Refund
from modules.lot.business.lot_views import list_user_names
from modules.lot.models.lot_models import Lot
from modules.oil.models.oil_models import Storage

LOT_STATUS_KINDS = {"pressing": ActivityKind.PRESSING, "pressed": ActivityKind.PRESSED, "withdrawn": ActivityKind.WITHDRAWAL}

PAYMENT_STATUS_KINDS = {"confirmed": ActivityKind.PAYMENT_CONFIRMED, "rejected": ActivityKind.PAYMENT_REJECTED, "cancelled": ActivityKind.PAYMENT_CANCELLED}

SIMPLE_KINDS = {
    "refund.made": ActivityKind.REFUND_MADE,
    "refund.confirmed": ActivityKind.REFUND_CONFIRMED,
    "expense.entered": ActivityKind.EXPENSE_RECORDED,
    "expense.changed": ActivityKind.EXPENSE_UPDATED,
    "expense.cancelled": ActivityKind.EXPENSE_CANCELLED,
    "debt_contact.added": ActivityKind.DEBT_CONTACT,
    "configuration.changed": ActivityKind.CONFIGURATION,
}


def build_day_feed(db: Session, site_id: UUID, day: date) -> list[JournalEventOut]:
    """
    Tell what happened on one Site on one Moroccan day, newest first: the day's Audit Events and Storages, each told as a business event with the record it points at, read in a fixed number of queries.

    Args:
        db (Session): Session to read with.
        site_id (UUID): Site.
        day (date): Day in Morocco.

    Returns:
        list[JournalEventOut]: The day's events.
    """
    starts_at = datetime.combine(day, time.min, APP_TIME_ZONE)
    ends_at = starts_at + timedelta(days=1)
    audit_events = list(db.scalars(select(AuditEvent).where(AuditEvent.site_id == site_id, AuditEvent.occurred_at >= starts_at, AuditEvent.occurred_at < ends_at)))
    storages = list(db.scalars(select(Storage).join(Lot, Lot.id == Storage.lot_id).where(Lot.site_id == site_id, Storage.stored_from >= starts_at, Storage.stored_from < ends_at)))
    ids_by_type: dict[str | None, set[UUID]] = {}
    for event in audit_events:
        if event.entity_id:
            ids_by_type.setdefault(event.entity_type, set()).add(event.entity_id)
    lot_ids = ids_by_type.get("lot", set()) | {storage.lot_id for storage in storages}
    lots = {lot.id: lot for lot in db.scalars(select(Lot).where(Lot.id.in_(lot_ids)))} if lot_ids else {}
    payments = {payment.id: payment for payment in db.scalars(select(Payment).where(Payment.id.in_(ids_by_type.get("payment", set()))))}
    refunds = {refund.id: refund for refund in db.scalars(select(Refund).where(Refund.id.in_(ids_by_type.get("refund", set()))))}
    expenses = {expense.id: expense for expense in db.scalars(select(Expense).where(Expense.id.in_(ids_by_type.get("expense", set()))))}
    client_ids = {lot.client_id for lot in lots.values()} | {payment.client_id for payment in payments.values()} | {refund.client_id for refund in refunds.values()} | ids_by_type.get("client", set())
    clients = {client.id: client.display_name for client in db.scalars(select(Client).where(Client.id.in_(client_ids)))} if client_ids else {}
    source_codes = {payment_id: code for payment_id, code in db.execute(select(Payment.id, Payment.code).where(Payment.id.in_({refund.source_payment_id for refund in refunds.values()})))} if refunds else {}
    varieties = dict(db.execute(select(OliveVariety.id, OliveVariety.name)).all())
    names = list_user_names(db, {event.actor_id for event in audit_events if event.actor_id} | {storage.created_by_id for storage in storages if storage.created_by_id})
    feed = [
        told
        for event in audit_events
        if (told := tell_event(event, names.get(event.actor_id, "") if event.actor_id else "", lots, payments, refunds, expenses, clients, source_codes, varieties)) is not None
    ]
    for storage in storages:
        lot = lots.get(storage.lot_id)
        if lot:
            feed.append(build_event(f"stored-{storage.id}", ActivityKind.STORED, storage.stored_from, names.get(storage.created_by_id, "") if storage.created_by_id else "", clients.get(lot.client_id, ""), {"code": lot.code or "", "tankId": str(storage.tank_id)}, "lot", lot.id, litres=float(storage.oil_in_litres)))
    return sorted(feed, key=lambda item: item.at, reverse=True)


def tell_event(event: AuditEvent, by: str, lots: dict, payments: dict, refunds: dict, expenses: dict, clients: dict, source_codes: dict, varieties: dict) -> JournalEventOut | None:
    """
    Tell one Audit Event as a Journal event, or None for an action the Journal doesn't show.

    Args:
        event (AuditEvent): The event.
        by (str): Name of who acted.
        lots (dict): Lots by id.
        payments (dict): Payments by id.
        refunds (dict): Refunds by id.
        expenses (dict): Expenses by id.
        clients (dict): Client names by id.
        source_codes (dict): Payment codes by id, for Refunds.
        varieties (dict): Variety names by slug.

    Returns:
        JournalEventOut | None: The Journal event.
    """
    after = event.after or {}
    if event.entity_type == "lot" and event.entity_id in lots:
        lot = lots[event.entity_id]
        subject, code = clients.get(lot.client_id, ""), lot.code or ""
        if event.action == "lot.received":
            return build_event(str(event.id), ActivityKind.RECEPTION, event.occurred_at, by, subject, {"code": code, "variety": varieties.get(lot.olive_variety_id, "")}, "lot", lot.id, kg=float(lot.net_weight_in_kg))
        if event.action == "lot.moved" and after.get("status") in LOT_STATUS_KINDS:
            kind = LOT_STATUS_KINDS[after["status"]]
            litres = float(lot.oil_in_litres) if lot.oil_in_litres is not None and kind != ActivityKind.PRESSING else None
            return build_event(str(event.id), kind, event.occurred_at, by, subject, {"code": code}, "lot", lot.id, litres=litres)
        if event.action == "discount.given":
            kind = ActivityKind.DISCOUNT_PENDING if after.get("state") == "pending" else ActivityKind.DISCOUNT_GIVEN
            return build_event(str(event.id), kind, event.occurred_at, by, subject, {"code": code, "percent": after.get("percent", 0)}, "lot", lot.id, amount=after.get("amount"))
        if event.action == "discount.decided":
            kind = ActivityKind.DISCOUNT_APPROVED if after.get("state") == "approved" else ActivityKind.DISCOUNT_REFUSED
            return build_event(str(event.id), kind, event.occurred_at, by, subject, {"code": code}, "lot", lot.id)
        return None
    if event.entity_type == "payment" and event.entity_id in payments:
        payment = payments[event.entity_id]
        params = {"code": payment.code or "", "method": payment.method.value}
        if event.action == "payment.recorded":
            kind = ActivityKind.PAYMENT_CONFIRMED if after.get("status") == "confirmed" else ActivityKind.PAYMENT_RECORDED
            return build_event(str(event.id), kind, event.occurred_at, by, clients.get(payment.client_id, ""), params, "payment", payment.id, amount=float(payment.amount))
        if event.action == "payment.decided" and after.get("status") in PAYMENT_STATUS_KINDS:
            return build_event(str(event.id), PAYMENT_STATUS_KINDS[after["status"]], event.occurred_at, by, clients.get(payment.client_id, ""), params, "payment", payment.id, amount=float(payment.amount))
        return None
    kind = SIMPLE_KINDS.get(event.action)
    if kind is None:
        return None
    if event.entity_type == "refund" and event.entity_id in refunds:
        refund = refunds[event.entity_id]
        return build_event(str(event.id), kind, event.occurred_at, by, clients.get(refund.client_id, ""), {"code": source_codes.get(refund.source_payment_id) or ""}, "refund", refund.id, amount=float(refund.amount))
    if event.entity_type == "expense" and event.entity_id in expenses:
        expense = expenses[event.entity_id]
        return build_event(str(event.id), kind, event.occurred_at, by, expense.description, {"code": expense.code or "", "category": expense.category_id}, "expense", expense.id, amount=float(expense.amount))
    if kind == ActivityKind.DEBT_CONTACT:
        return build_event(str(event.id), kind, event.occurred_at, by, clients.get(event.entity_id, ""), {"contact": after.get("kind", ""), "promisedOn": after.get("promisedOn") or ""}, "client", event.entity_id)
    if kind == ActivityKind.CONFIGURATION:
        key = next(iter(after), "") if isinstance(after, dict) else ""
        return build_event(str(event.id), kind, event.occurred_at, by, key, {"key": key}, "configuration", event.entity_id)
    return None


def build_event(event_id: str, kind: ActivityKind, at: datetime, by: str, subject: str, params: dict, entity_type: str, entity_id: UUID | None, amount: float | None = None, litres: float | None = None, kg: float | None = None) -> JournalEventOut:
    """
    Assemble one Journal event, with its group and whether it shows money.

    Returns:
        JournalEventOut: The event.
    """
    group = GROUP_BY_KIND[kind]
    return JournalEventOut(id=event_id, kind=kind, group=group, at=at, by=by, subject=subject, params=params, amount=amount, litres=litres, kg=kg, is_money=group in MONEY_GROUPS, entity_type=entity_type, entity_id=entity_id)
