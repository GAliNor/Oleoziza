from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from modules.finance.business.client_credit import get_lot_credits
from modules.finance.models.finance_models import CreditNoteUse, Discount, Payment, PaymentAllocation
from modules.finance.types.finance_types import DiscountState, PaymentStatus
from modules.lot.models.lot_models import Lot


def get_fees(db: Session, lots: list[Lot]) -> dict[UUID, Decimal]:
    """
    Compute each Lot's Milling Fee: net weight × rate, minus a Discount applied or approved (a pending one counts at full price), in one query.

    Args:
        db (Session): Session to read with.
        lots (list[Lot]): Lots to price.

    Returns:
        dict[UUID, Decimal]: Fee per Lot (0 for a purchase).
    """
    discounts = {lot_id: amount for lot_id, amount in db.execute(select(Discount.lot_id, Discount.amount).where(Discount.lot_id.in_([lot.id for lot in lots]), Discount.state.in_((DiscountState.APPLIED, DiscountState.APPROVED))))} if lots else {}
    return {lot.id: max(lot.net_weight_in_kg * (lot.milling_rate_per_kg or Decimal(0)) - discounts.get(lot.id, Decimal(0)), Decimal(0)) for lot in lots}


def get_amounts_due(db: Session, lots: list[Lot]) -> dict[UUID, Decimal]:
    """
    What each Lot still owes: its fee minus confirmed and pending Allocations and the Credit Note Uses taken off it, in three queries.

    Args:
        db (Session): Session to read with.
        lots (list[Lot]): Lots to read.

    Returns:
        dict[UUID, Decimal]: Amount due per Lot, never below zero.
    """
    if not lots:
        return {}
    lot_ids = [lot.id for lot in lots]
    fees = get_fees(db, lots)
    allocated = {lot_id: amount for lot_id, amount in db.execute(select(PaymentAllocation.lot_id, func.sum(PaymentAllocation.amount)).join(Payment, Payment.id == PaymentAllocation.payment_id).where(PaymentAllocation.lot_id.in_(lot_ids), Payment.status.in_((PaymentStatus.CONFIRMED, PaymentStatus.PENDING))).group_by(PaymentAllocation.lot_id))}
    credits = get_lot_credits(db, lot_ids)
    return {lot.id: max(fees[lot.id] - allocated.get(lot.id, Decimal(0)) - credits.get(lot.id, Decimal(0)), Decimal(0)) for lot in lots}


def list_client_debts(db: Session, site_ids: list[UUID]) -> dict[UUID, Decimal]:
    """
    What each Client still owes on their Lots of some Sites, every Season included, summed in one query with the same figures as get_amounts_due: fee (net weight × rate, minus the Discount in force, never below zero) minus confirmed and pending Allocations and Credit Note Uses, each Lot never below zero.

    Args:
        db (Session): Session to read with.
        site_ids (list[UUID]): Sites whose Lots count.

    Returns:
        dict[UUID, Decimal]: Amount owed per Client, only Clients who owe something.
    """
    if not site_ids:
        return {}
    discounts = select(Discount.lot_id, func.sum(Discount.amount).label("amount")).where(Discount.state.in_((DiscountState.APPLIED, DiscountState.APPROVED))).group_by(Discount.lot_id).subquery()
    allocations = select(PaymentAllocation.lot_id, func.sum(PaymentAllocation.amount).label("amount")).join(Payment, Payment.id == PaymentAllocation.payment_id).where(Payment.status.in_((PaymentStatus.CONFIRMED, PaymentStatus.PENDING))).group_by(PaymentAllocation.lot_id).subquery()
    credits = select(CreditNoteUse.lot_id, func.sum(CreditNoteUse.amount).label("amount")).group_by(CreditNoteUse.lot_id).subquery()
    fee = func.greatest(Lot.net_weight_in_kg * func.coalesce(Lot.milling_rate_per_kg, 0) - func.coalesce(discounts.c.amount, 0), 0)
    due = func.greatest(fee - func.coalesce(allocations.c.amount, 0) - func.coalesce(credits.c.amount, 0), 0)
    query = (
        select(Lot.client_id, func.sum(due))
        .outerjoin(discounts, discounts.c.lot_id == Lot.id)
        .outerjoin(allocations, allocations.c.lot_id == Lot.id)
        .outerjoin(credits, credits.c.lot_id == Lot.id)
        .where(Lot.site_id.in_(site_ids))
        .group_by(Lot.client_id)
        .having(func.sum(due) > 0)
    )
    return {client_id: amount for client_id, amount in db.execute(query)}
