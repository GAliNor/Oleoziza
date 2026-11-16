from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.audit.models.audit_models import AuditEvent
from modules.configuration.services.configuration_services import ConfigurationService
from modules.configuration.types.configuration_types import ConfigurationValueKey
from modules.finance.models.finance_models import Discount, Payment, PaymentAllocation
from modules.finance.types.finance_types import DiscountEntry, DiscountState, PaymentStatus
from modules.lot.business.lot_views import build_lot_views
from modules.lot.services.lot_services import LotService
from modules.lot.types.lot_types import DiscountDecisionIn, DiscountGiftIn, LotOut
from modules.site.models.site_models import Season
from modules.user.types.user_types import Permission


DISCOUNT_GIVEN_ACTION = "discount.given"

DISCOUNT_DECIDED_ACTION = "discount.decided"


class DiscountService:
    def __init__(self, db: Session, current_user: CurrentUser) -> None:
        """
        Keep the session and the User giving or deciding Discounts.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
        """
        self.db = db
        self.current_user = current_user
        self.lots = LotService(db, current_user)

    def give_discount(self, lot_id: UUID, payload: DiscountGiftIn) -> LotOut:
        """
        Give a Discount on a Lot's Milling Fee: within the Discount Limit it applies at once, above it waits for Management (the Owner is never held).

        Args:
            lot_id (UUID): Lot reduced.
            payload (DiscountGiftIn): Amount and percent.

        Returns:
            LotOut: The Lot with its Discount.

        Raises:
            RefusedError: lot_not_found, discounts_forbidden, discount_already_given, discount_too_high.
        """
        lot = self.lots.get_lot_row(lot_id)
        if self.db.get(AuditEvent, payload.id) is not None:
            return build_lot_views(self.db, [lot])[0]
        if not self.current_user.has_permission(lot.site_id, Permission.DISCOUNT_GIVE):
            raise RefusedError("discounts_forbidden", 403)
        if self.db.scalar(select(Discount.id).where(Discount.lot_id == lot.id, Discount.state != DiscountState.REFUSED).limit(1)):
            raise RefusedError("discount_already_given")
        amount = Decimal(str(payload.amount_dh))
        if amount > self._get_amount_due(lot.id, lot.net_weight_in_kg, lot.milling_rate_per_kg or Decimal(0)):
            raise RefusedError("discount_too_high", 422)
        limit = ConfigurationService(self.db).get_price_in_force(lot.site_id, self.db.get(Season, lot.season_id), ConfigurationValueKey.DISCOUNT_LIMIT)
        is_over_limit = Decimal(str(payload.percent)) > limit and not self.current_user.is_owner
        discount = Discount(lot_id=lot.id, entered_as=DiscountEntry.AMOUNT, percent=Decimal(str(payload.percent)), amount=amount, limit_percent=limit, state=DiscountState.PENDING if is_over_limit else DiscountState.APPLIED, created_by_id=self.current_user.id)
        self.db.add(discount)
        self.db.flush()
        record_audit_event(self.db, self.current_user.id, DISCOUNT_GIVEN_ACTION, site_id=lot.site_id, entity_type="lot", entity_id=lot.id, after={"amount": payload.amount_dh, "percent": payload.percent, "state": discount.state.value}, event_id=payload.id)
        self.db.commit()
        return build_lot_views(self.db, [lot])[0]

    def decide_discount(self, lot_id: UUID, payload: DiscountDecisionIn) -> LotOut:
        """
        Approve or refuse a Discount waiting above the limit; nobody but the Owner decides their own.

        Args:
            lot_id (UUID): Lot reduced.
            payload (DiscountDecisionIn): The decision.

        Returns:
            LotOut: The Lot after the decision.

        Raises:
            RefusedError: lot_not_found, discounts_forbidden, discount_not_pending, discount_own, reason_required.
        """
        lot = self.lots.get_lot_row(lot_id)
        if self.db.get(AuditEvent, payload.id) is not None:
            return build_lot_views(self.db, [lot])[0]
        if not self.current_user.has_permission(lot.site_id, Permission.DISCOUNT_APPROVE):
            raise RefusedError("discounts_forbidden", 403)
        discount = self.db.scalar(select(Discount).where(Discount.lot_id == lot.id, Discount.state == DiscountState.PENDING))
        if discount is None:
            raise RefusedError("discount_not_pending")
        if discount.created_by_id == self.current_user.id and not self.current_user.is_owner:
            raise RefusedError("discount_own", 403)
        if not payload.is_approved and not (payload.reason or "").strip():
            raise RefusedError("reason_required", 422)
        discount.state = DiscountState.APPROVED if payload.is_approved else DiscountState.REFUSED
        discount.decided_at = datetime.now(timezone.utc)
        discount.decided_by_id = self.current_user.id
        discount.refusal_reason = None if payload.is_approved else (payload.reason or "").strip()
        record_audit_event(self.db, self.current_user.id, DISCOUNT_DECIDED_ACTION, site_id=lot.site_id, entity_type="lot", entity_id=lot.id, after={"state": discount.state.value, "reason": discount.refusal_reason}, event_id=payload.id)
        self.db.commit()
        return build_lot_views(self.db, [lot])[0]

    def _get_amount_due(self, lot_id: UUID, net_kg: Decimal, rate: Decimal) -> Decimal:
        """
        Read what a Lot still owes: its Milling Fee minus the Payments allocated to it, confirmed or pending.

        Args:
            lot_id (UUID): Lot to read.
            net_kg (Decimal): Its net weight.
            rate (Decimal): Its milling rate per kg.

        Returns:
            Decimal: Amount due, in dirhams.
        """
        allocated = self.db.scalar(
            select(func.coalesce(func.sum(PaymentAllocation.amount), 0)).join(Payment, Payment.id == PaymentAllocation.payment_id).where(PaymentAllocation.lot_id == lot_id, Payment.status.in_((PaymentStatus.CONFIRMED, PaymentStatus.PENDING)))
        )
        return net_kg * rate - Decimal(allocated)


def get_discount_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)) -> DiscountService:
    """
    Build the discount service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.

    Returns:
        DiscountService: Service bound to the session and actor.
    """
    return DiscountService(db, current_user)
