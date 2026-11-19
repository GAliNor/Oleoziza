from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.finance.models.finance_models import RateCorrection
from modules.lot.types.lot_types import LotRateCorrectionOut


def list_rate_corrections(db: Session, lot_ids: list[UUID]) -> dict[UUID, list[RateCorrection]]:
    """
    Read every Milling Rate correction of some Lots, oldest first, in one query.

    Args:
        db (Session): Session to read with.
        lot_ids (list[UUID]): Lots to read.

    Returns:
        dict[UUID, list[RateCorrection]]: Corrections per Lot.
    """
    corrections: dict[UUID, list[RateCorrection]] = {}
    for correction in db.scalars(select(RateCorrection).where(RateCorrection.lot_id.in_(lot_ids)).order_by(RateCorrection.created_at, RateCorrection.id)):
        corrections.setdefault(correction.lot_id, []).append(correction)
    return corrections


def map_rate_correction(correction: RateCorrection, names: dict[UUID, str]) -> LotRateCorrectionOut:
    """
    Shape one correction for the Lot's timeline.

    Args:
        correction (RateCorrection): The correction row.
        names (dict[UUID, str]): Names of the Users involved.

    Returns:
        LotRateCorrectionOut: The correction as screens read it.
    """
    return LotRateCorrectionOut(
        previous_rate_per_kg=float(correction.previous_rate_per_kg),
        new_rate_per_kg=float(correction.new_rate_per_kg),
        reason=correction.reason,
        by=names.get(correction.created_by_id, "") if correction.created_by_id else "",
        at=correction.created_at,
    )
