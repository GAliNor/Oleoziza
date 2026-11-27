from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from unittest.mock import MagicMock
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.app_init import init_models
from core.types import CurrentUser
from modules.assistant.business.query_compiler import QueryScope, compile_query
from modules.assistant.types.assistant_types import BusinessQuery
from modules.client.models.client_models import Client
from modules.configuration.models.configuration_models import PressLine
from modules.finance.models.finance_models import CreditNote, CreditNoteUse
from modules.finance.services.finance_desk_services import FinanceDeskService
from modules.finance.types.finance_types import DiscountState, PaymentStatus, SettlementOrigin
from modules.lot.models.lot_models import Lot
from modules.lot.types.lot_types import LotMode
from modules.site.models.site_models import Site
from tests.factories import create_lot, create_site, open_fresh_season
from tests.modules.finance.test_lot_fees import add_discount, add_payment, copy_lot


@dataclass
class MillData:
    site: Site
    other_site: Site
    first_lot: Lot
    second_client: Client


def build_mill(db: Session) -> MillData:
    """
    Two Sites and a fresh Season, with Lots covering every fee rule: an applied Discount, a pending one, rejected, pending and confirmed Payments, an overpaid Lot, a Credit Note Use, a Purchase, a refused Discount, and a Lot on the other Site.

    Args:
        db (Session): Test session.

    Returns:
        MillData: The Sites and the records later assertions name.
    """
    init_models()
    site, other_site = create_site(db, "AA"), create_site(db, "AB")
    open_fresh_season(db)
    line = PressLine(site_id=site.id, number=1)
    db.add(line)
    db.flush()
    first = create_lot(db, site, line.id)
    first_client = db.get(Client, first.client_id)
    second_client = Client(kind=first_client.kind, first_name="Karim", last_name="Bennani", phone="+212669990911", province_id=first_client.province_id, city="Oujda", address="Test", first_site_id=site.id, entered_at=first.entered_at)
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
    copy_lot(db, first, client_id=second_client.id, mode=LotMode.PURCHASE, suggested_milling_rate_per_kg=None, milling_rate_per_kg=None, daily_price_per_kg=Decimal("8"))
    refused_discount = copy_lot(db, first, client_id=second_client.id)
    add_discount(db, refused_discount, "200", DiscountState.REFUSED)
    other_line = PressLine(site_id=other_site.id, number=1)
    db.add(other_line)
    db.flush()
    copy_lot(db, first, site_id=other_site.id, press_line_id=other_line.id)
    db.flush()
    return MillData(site=site, other_site=other_site, first_lot=first, second_client=second_client)


def build_owner() -> CurrentUser:
    """
    An Owner token's User, who holds every Site and Permission.

    Returns:
        CurrentUser: The Owner.
    """
    return CurrentUser(id=uuid4(), role="management", is_owner=True, permissions_by_site={})


def read_rows(db: Session, query: BusinessQuery, site_ids: list[UUID], can_see_money: bool = True) -> list[dict[str, Any]]:
    """
    Compile a query for some Sites and run it.

    Args:
        db (Session): Test session.
        query (BusinessQuery): Query to run.
        site_ids (list[UUID]): Sites in scope.
        can_see_money (bool): Whether money is visible.

    Returns:
        list[dict[str, Any]]: Rows.
    """
    compiled = compile_query(query, QueryScope(site_ids=site_ids, can_see_money=can_see_money))
    return [dict(row) for row in db.execute(text(compiled.sql), compiled.params).mappings()]


def get_sales_figures(db: Session, site_id: UUID) -> dict[str, float]:
    """
    The Finances tab's four figures for the Season on one Site, as the reference.

    Args:
        db (Session): Test session.
        site_id (UUID): Site read.

    Returns:
        dict[str, float]: revenue, collected, pending and outstanding.
    """
    figures = FinanceDeskService(db, build_owner(), MagicMock()).get_sales([site_id], "season").figures
    return {"revenue": figures.revenue, "collected": figures.collected, "pending": figures.pending, "outstanding": figures.outstanding}
