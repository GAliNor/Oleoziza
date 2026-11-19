from decimal import Decimal
from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.audit.models.audit_models import AuditEvent
from modules.finance.business.rate_correction import check_rate_correction
from modules.finance.models.finance_models import RateCorrection
from modules.lot.business.lot_views import build_lot_views
from modules.lot.services.lot_services import LotService
from modules.lot.types.lot_types import LotOut, RateCorrectionIn
from modules.user.types.user_types import Permission


RATE_CORRECTED_ACTION = "lot.rate_corrected"


class RateCorrectionService:
    def __init__(self, db: Session, current_user: CurrentUser) -> None:
        """
        Keep the session and the User correcting a Lot's Milling Rate.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
        """
        self.db = db
        self.current_user = current_user
        self.lots = LotService(db, current_user)

    def correct_rate(self, lot_id: UUID, payload: RateCorrectionIn) -> LotOut:
        """
        Change a Lot's Milling Rate until it is paid, keeping the old and new rates and the reason; a replay of the same event id answers the Lot as it is.

        Args:
            lot_id (UUID): Lot corrected.
            payload (RateCorrectionIn): New rate and reason.

        Returns:
            LotOut: The Lot at its new rate.

        Raises:
            RefusedError: lot_not_found, rates_forbidden, reason_required, rate_unchanged, rate_not_applicable, lot_already_paid, rate_below_discount, rate_below_paid.
        """
        lot = self.lots.get_lot_row(lot_id)
        if self.db.get(AuditEvent, payload.id) is not None:
            return build_lot_views(self.db, [lot])[0]
        if not self.current_user.has_permission(lot.site_id, Permission.LOT_SET_PRICE):
            raise RefusedError("rates_forbidden", 403)
        reason = payload.reason.strip()
        if not reason:
            raise RefusedError("reason_required", 422)
        new_rate = Decimal(str(payload.milling_rate_per_kg)).quantize(Decimal("0.01"))
        previous_rate = lot.milling_rate_per_kg or Decimal(0)
        if new_rate == previous_rate:
            raise RefusedError("rate_unchanged", 422)
        check_rate_correction(self.db, lot, new_rate)
        self.db.add(RateCorrection(lot_id=lot.id, previous_rate_per_kg=previous_rate, new_rate_per_kg=new_rate, reason=reason, created_by_id=self.current_user.id))
        lot.milling_rate_per_kg = new_rate
        self.db.flush()
        record_audit_event(self.db, self.current_user.id, RATE_CORRECTED_ACTION, site_id=lot.site_id, entity_type="lot", entity_id=lot.id, before={"millingRatePerKg": float(previous_rate)}, after={"millingRatePerKg": float(new_rate), "reason": reason}, event_id=payload.id)
        self.db.commit()
        return build_lot_views(self.db, [lot])[0]


def get_rate_correction_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)) -> RateCorrectionService:
    """
    Build the rate correction service for one request.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): Signed-in User.

    Returns:
        RateCorrectionService: The service.
    """
    return RateCorrectionService(db, current_user)
