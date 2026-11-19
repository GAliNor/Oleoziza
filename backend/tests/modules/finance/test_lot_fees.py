from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.app_init import init_models
from modules.client.models.client_models import Client
from modules.configuration.models.configuration_models import PressLine
from modules.configuration.types.configuration_types import PaymentMethod
from modules.finance.business.lot_fees import get_amounts_due, list_client_debts
from modules.finance.models.finance_models import CreditNote, CreditNoteUse, Discount, Payment, PaymentAllocation
from modules.finance.types.finance_types import DiscountEntry, DiscountState, PaymentStatus, SettlementOrigin
from modules.lot.models.lot_models import Lot
from modules.lot.types.lot_types import LotMode
from tests.factories import create_lot, create_site, open_fresh_season


def copy_lot(db: Session, template: Lot, **changes: Any) -> Lot:
    """
    Add another Lot like a template, with some fields changed.

    Args:
        db (Session): Test session.
        template (Lot): Lot to copy.
        **changes (Any): Fields that differ.

    Returns:
        Lot: The saved Lot.
    """
    fields = {key: getattr(template, key) for key in ("site_id", "season_id", "client_id", "mode", "olive_variety_id", "net_weight_in_kg", "suggested_milling_rate_per_kg", "milling_rate_per_kg", "notification_choice", "press_line_id", "planned_start_at", "entered_at")}
    lot = Lot(**{**fields, **changes})
    db.add(lot)
    db.flush()
    return lot


def add_payment(db: Session, lot: Lot, amount: str, status: PaymentStatus) -> Payment:
    """
    Add a Payment of a Lot's Client allocated wholly to that Lot.

    Args:
        db (Session): Test session.
        lot (Lot): Lot paid.
        amount (str): Amount paid and allocated.
        status (PaymentStatus): Where the Payment stands.

    Returns:
        Payment: The saved Payment.
    """
    payment = Payment(site_id=lot.site_id, client_id=lot.client_id, method=PaymentMethod.CASH, amount=Decimal(amount), status=status, entered_at=datetime.now(timezone.utc))
    db.add(payment)
    db.flush()
    db.add(PaymentAllocation(payment_id=payment.id, lot_id=lot.id, amount=Decimal(amount)))
    return payment


def add_discount(db: Session, lot: Lot, amount: str, state: DiscountState) -> None:
    """
    Add a Discount on a Lot.

    Args:
        db (Session): Test session.
        lot (Lot): Lot discounted.
        amount (str): Discount amount.
        state (DiscountState): Where the Discount stands.
    """
    refusal_reason = "Too high" if state == DiscountState.REFUSED else None
    db.add(Discount(lot_id=lot.id, entered_as=DiscountEntry.AMOUNT, percent=Decimal("10"), amount=Decimal(amount), limit_percent=Decimal("5"), state=state, refusal_reason=refusal_reason))


def sum_debts_in_python(db: Session, site_ids: list[UUID]) -> dict[UUID, Decimal]:
    """
    The reference figures: each Lot's amount due from get_amounts_due, summed per Client, keeping Clients who owe.

    Args:
        db (Session): Test session.
        site_ids (list[UUID]): Sites whose Lots count.

    Returns:
        dict[UUID, Decimal]: Amount owed per Client.
    """
    lots = list(db.scalars(select(Lot).where(Lot.site_id.in_(site_ids))))
    dues = get_amounts_due(db, lots)
    owed: dict[UUID, Decimal] = {}
    for lot in lots:
        owed[lot.client_id] = owed.get(lot.client_id, Decimal(0)) + dues[lot.id]
    return {client_id: amount for client_id, amount in owed.items() if amount > 0}


def test_client_debts_in_sql_match_the_lot_by_lot_figures(db: Session) -> None:
    """
    Summed in one query, a Client's debt still counts only Discounts in force, confirmed and pending Payments and Credit Note Uses, never lets an overpaid Lot cancel another Lot's debt, prices a purchase at zero and stays on the Sites asked for.
    """
    init_models()
    site, other_site = create_site(db, "DA"), create_site(db, "DB")
    open_fresh_season(db)
    line = PressLine(site_id=site.id, number=1)
    db.add(line)
    db.flush()
    first = create_lot(db, site, line.id)
    first_client = db.get(Client, first.client_id)
    second_client = Client(kind=first_client.kind, first_name="Second", last_name="Client", phone="+212669990901", province_id=first_client.province_id, city="Oujda", address="Test", first_site_id=site.id, entered_at=first.entered_at)
    db.add(second_client)
    db.flush()
    add_discount(db, first, "50", DiscountState.APPLIED)
    add_payment(db, first, "100", PaymentStatus.CONFIRMED)
    pending_discount = copy_lot(db, first)
    add_discount(db, pending_discount, "100", DiscountState.PENDING)
    add_payment(db, pending_discount, "500", PaymentStatus.REJECTED)
    add_payment(db, pending_discount, "200", PaymentStatus.PENDING)
    overpaid = copy_lot(db, first)
    add_payment(db, overpaid, "600", PaymentStatus.CONFIRMED)
    credited = copy_lot(db, first)
    source = add_payment(db, overpaid, "1", PaymentStatus.CONFIRMED)
    credit_note = CreditNote(site_id=site.id, client_id=first.client_id, origin=SettlementOrigin.OVERPAYMENT, source_payment_id=source.id, amount=Decimal("120"))
    db.add(credit_note)
    db.flush()
    db.add(CreditNoteUse(credit_note_id=credit_note.id, lot_id=credited.id, amount=Decimal("120")))
    copy_lot(db, first, client_id=second_client.id, mode=LotMode.PURCHASE, suggested_milling_rate_per_kg=None, milling_rate_per_kg=None)
    refused_discount = copy_lot(db, first, client_id=second_client.id)
    add_discount(db, refused_discount, "200", DiscountState.REFUSED)
    other_line = PressLine(site_id=other_site.id, number=1)
    db.add(other_line)
    db.flush()
    copy_lot(db, first, site_id=other_site.id, press_line_id=other_line.id)
    db.flush()

    debts = list_client_debts(db, [site.id])

    assert debts == {first.client_id: Decimal("1030"), second_client.id: Decimal("500")}
    assert debts == sum_debts_in_python(db, [site.id])
    assert list_client_debts(db, [other_site.id]) == {first.client_id: Decimal("500")}
    assert list_client_debts(db, []) == {}
