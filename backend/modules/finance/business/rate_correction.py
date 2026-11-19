from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.exceptions import RefusedError
from modules.finance.business.lot_fees import get_amounts_due, get_fees
from modules.finance.models.finance_models import Discount
from modules.finance.types.finance_types import DiscountState
from modules.lot.models.lot_models import Lot
from modules.lot.types.lot_types import LotMode


def check_rate_correction(db: Session, lot: Lot, new_rate: Decimal) -> None:
    """
    Refuse a new Milling Rate that can't apply: a Lot not milled for a Client, a Lot already paid, a full fee below its Discount, or a fee below what is already paid or awaiting confirmation.

    Args:
        db (Session): Session to read with.
        lot (Lot): The Lot corrected.
        new_rate (Decimal): The new Milling Rate per kg.

    Raises:
        RefusedError: rate_not_applicable, lot_already_paid, rate_below_discount, rate_below_paid.
    """
    if lot.mode != LotMode.SERVICE_MILLING:
        raise RefusedError("rate_not_applicable", 422)
    fee = get_fees(db, [lot])[lot.id]
    due = get_amounts_due(db, [lot])[lot.id]
    settled = fee - due
    if settled > 0 and due == 0:
        raise RefusedError("lot_already_paid")
    discounts = db.execute(select(Discount.amount, Discount.state).where(Discount.lot_id == lot.id, Discount.state != DiscountState.REFUSED)).all()
    new_full_fee = lot.net_weight_in_kg * new_rate
    if any(new_full_fee < amount for amount, _ in discounts):
        raise RefusedError("rate_below_discount", 422)
    discount_in_force = sum((amount for amount, state in discounts if state in (DiscountState.APPLIED, DiscountState.APPROVED)), Decimal(0))
    if new_full_fee - discount_in_force < settled:
        raise RefusedError("rate_below_paid", 422)
