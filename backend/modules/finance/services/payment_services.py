from datetime import datetime, time, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import Depends
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.helpers import APP_TIME_ZONE
from core.integrations.rustfs.rustfs_client import RustFSClient, get_rustfs_client
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.client.models.client_models import Client
from modules.configuration.types.configuration_types import PaymentMethod
from modules.file.business.private_files import store_private_file
from modules.finance.business.movement_views import build_movement_views
from modules.finance.models.finance_models import CreditNote, Payment, PaymentAllocation, PaymentProof, Refund
from modules.finance.types.finance_types import LotPaymentLinkIn, MovementDecisionIn, MovementOut, PaymentDocumentIn, PaymentRecordIn, PaymentStatus, Settlement, SettlementOrigin
from modules.lot.models.lot_models import Lot
from modules.site.business.code_sequences import give_next_code
from modules.site.business.season_lookup import get_open_season, get_period_range
from modules.site.business.site_scope import resolve_site_ids
from modules.site.models.site_models import Site
from modules.site.types.site_types import CodeKind
from modules.user.types.user_types import Permission


PAYMENT_RECORDED_ACTION = "payment.recorded"

PAYMENT_DECIDED_ACTION = "payment.decided"

PAYMENT_LINKED_ACTION = "payment.linked"

PAYMENT_DOCUMENTS_ADDED_ACTION = "payment.documents_added"


class PaymentService:
    def __init__(self, db: Session, current_user: CurrentUser, storage: RustFSClient) -> None:
        """
        Keep the session, the User at the cash desk, and the storage holding Payment Proofs.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
            storage (RustFSClient): RustFS client.
        """
        self.db = db
        self.current_user = current_user
        self.storage = storage

    def list_payments(self, site_ids: list[UUID]) -> list[MovementOut]:
        """
        List the Payments recorded since the open Season started on the Sites asked for, newest first.

        Args:
            site_ids (list[UUID]): Sites to read, every Site held when none.

        Returns:
            list[MovementOut]: The Payments.
        """
        scoped = resolve_site_ids(self.db, self.current_user, site_ids)
        starts_on, _ = get_period_range(self.db, "season")
        query = select(Payment).where(Payment.site_id.in_(scoped), Payment.entered_at >= datetime.combine(starts_on, time.min, APP_TIME_ZONE)).order_by(Payment.entered_at.desc())
        return build_movement_views(self.db, self.storage, list(self.db.scalars(query)))

    def page_payments(self, site_ids: list[UUID], pending_only: bool, search: str, period: str, offset: int, limit: int) -> tuple[list[MovementOut], int]:
        """
        Read one page of the register: the Payments waiting for a decision (oldest first, any date), or every Payment of the period (newest first), filtered by Client name or code.

        Args:
            site_ids (list[UUID]): Sites to read.
            pending_only (bool): The « to confirm » list.
            search (str): Client name or Payment code.
            period (str): Period of the « all » list.
            offset (int): First row.
            limit (int): Rows per page.

        Returns:
            tuple[list[MovementOut], int]: The page and the list's size.
        """
        scoped = resolve_site_ids(self.db, self.current_user, site_ids)
        query = select(Payment).join(Client, Client.id == Payment.client_id).where(Payment.site_id.in_(scoped))
        if pending_only:
            query = query.where(Payment.status == PaymentStatus.PENDING).order_by(Payment.entered_at, Payment.id)
        else:
            starts_on, ends_on = get_period_range(self.db, period)
            query = query.where(Payment.entered_at >= datetime.combine(starts_on, time.min, APP_TIME_ZONE), Payment.entered_at <= datetime.combine(ends_on, time.max, APP_TIME_ZONE)).order_by(Payment.entered_at.desc(), Payment.id)
        if search.strip():
            pattern = f"%{search.strip()}%"
            query = query.where(or_(Payment.code.ilike(pattern), Client.legal_name.ilike(pattern), Client.first_name.ilike(pattern), Client.last_name.ilike(pattern)))
        total = self.db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
        payments = list(self.db.scalars(query.offset(offset).limit(limit)))
        return build_movement_views(self.db, self.storage, payments), total or 0

    def record_payment(self, payload: PaymentRecordIn) -> MovementOut:
        """
        Record a Payment and split it over the Lots it pays; cash taken by someone who may confirm is final at once, anything else waits. A replay answers the Payment already saved.

        Args:
            payload (PaymentRecordIn): The Payment as typed.

        Returns:
            MovementOut: The Payment as saved.

        Raises:
            RefusedError: payments_forbidden, client_not_found, method_invalid, oil_litres_required, links_too_high, lot_not_payable, season_not_open.
        """
        existing = self.db.get(Payment, payload.id)
        if existing is not None:
            return build_movement_views(self.db, self.storage, [existing])[0]
        if not self.current_user.has_permission(payload.site_id, Permission.PAYMENT_RECORD):
            raise RefusedError("payments_forbidden", 403)
        if self.db.get(Client, payload.client_id) is None:
            raise RefusedError("client_not_found", 404)
        method = self._parse_method(payload.method)
        if method == PaymentMethod.OIL and payload.oil_litres is None:
            raise RefusedError("oil_litres_required", 422)
        season = get_open_season(self.db)
        if season is None:
            raise RefusedError("season_not_open")
        self._check_links(payload.site_id, payload.client_id, payload.lot_links, Decimal(str(payload.amount)))
        is_final = payload.is_final and method == PaymentMethod.CASH and self.current_user.has_permission(payload.site_id, Permission.PAYMENT_CONFIRM)
        now = datetime.now(timezone.utc)
        payment = Payment(
            id=payload.id,
            code=give_next_code(self.db, self.db.get(Site, payload.site_id), season, CodeKind.PAYMENT),
            site_id=payload.site_id,
            client_id=payload.client_id,
            method=method,
            amount=Decimal(str(payload.amount)),
            reference=payload.reference,
            oil_in_litres=Decimal(str(payload.oil_litres)) if payload.oil_litres is not None else None,
            oil_price_per_litre=(Decimal(str(payload.amount)) / Decimal(str(payload.oil_litres))).quantize(Decimal("0.01")) if payload.oil_litres else None,
            status=PaymentStatus.CONFIRMED if is_final else PaymentStatus.PENDING,
            decided_at=now if is_final else None,
            decided_by_id=self.current_user.id if is_final else None,
            entered_at=payload.entered_at or now,
            was_recorded_offline=payload.recorded_offline,
            device_label=payload.device_label,
            created_by_id=self.current_user.id,
        )
        self.db.add(payment)
        self.db.flush()
        self._replace_links(payment, payload.lot_links)
        self._add_documents(payment, payload.documents)
        record_audit_event(self.db, self.current_user.id, PAYMENT_RECORDED_ACTION, site_id=payment.site_id, entity_type="payment", entity_id=payment.id, after={"code": payment.code, "amount": payload.amount, "method": method.value, "status": payment.status.value})
        self.db.commit()
        return build_movement_views(self.db, self.storage, [payment])[0]

    def decide_payment(self, payment_id: UUID, payload: MovementDecisionIn) -> MovementOut:
        """
        Confirm or reject a pending Payment, or cancel a confirmed one; a surplus or a cancelled amount becomes a Credit Note or a Refund.

        Args:
            payment_id (UUID): Payment decided.
            payload (MovementDecisionIn): Decision, note and settlement.

        Returns:
            MovementOut: The Payment after the decision.

        Raises:
            RefusedError: payment_not_found, payments_forbidden, movement_not_decidable, movement_not_linked, surplus_not_settled.
        """
        payment = self._get_payment(payment_id)
        status = PaymentStatus(payload.status)
        if payment.status == status:
            return build_movement_views(self.db, self.storage, [payment])[0]
        permission = Permission.PAYMENT_CANCEL if status == PaymentStatus.CANCELLED else Permission.PAYMENT_CONFIRM
        if not self.current_user.has_permission(payment.site_id, permission):
            raise RefusedError("payments_forbidden", 403)
        is_allowed = payment.status == PaymentStatus.CONFIRMED if status == PaymentStatus.CANCELLED else payment.status == PaymentStatus.PENDING
        if not is_allowed:
            raise RefusedError("movement_not_decidable")
        allocated = self.db.scalar(select(func.coalesce(func.sum(PaymentAllocation.amount), 0)).where(PaymentAllocation.payment_id == payment.id))
        surplus = payment.amount - Decimal(allocated)
        if status == PaymentStatus.CONFIRMED and allocated == 0:
            raise RefusedError("movement_not_linked")
        if status == PaymentStatus.CONFIRMED and surplus > 0 and payload.settlement is None:
            raise RefusedError("surplus_not_settled", 422)
        before = payment.status
        payment.status = status
        payment.decided_at = datetime.now(timezone.utc)
        payment.decided_by_id = self.current_user.id
        payment.decision_note = payload.note
        if status == PaymentStatus.CONFIRMED and surplus > 0 and payload.settlement:
            self._settle(payment, payload.settlement, surplus, SettlementOrigin.OVERPAYMENT)
        if status == PaymentStatus.CANCELLED and payload.settlement:
            self._settle(payment, payload.settlement, payment.amount, SettlementOrigin.PAYMENT_CANCELLED)
        record_audit_event(self.db, self.current_user.id, PAYMENT_DECIDED_ACTION, site_id=payment.site_id, entity_type="payment", entity_id=payment.id, before={"status": before.value}, after={"status": status.value, "note": payload.note, "settlement": payload.settlement.value if payload.settlement else None})
        self.db.commit()
        return build_movement_views(self.db, self.storage, [payment])[0]

    def link_lots(self, payment_id: UUID, lot_links: list[LotPaymentLinkIn]) -> MovementOut:
        """
        Change which Lots a pending Payment pays.

        Args:
            payment_id (UUID): Payment to split.
            lot_links (list[LotPaymentLinkIn]): New Allocations.

        Returns:
            MovementOut: The Payment.

        Raises:
            RefusedError: payment_not_found, payments_forbidden, movement_not_pending, links_too_high, lot_not_payable.
        """
        payment = self._get_payment(payment_id)
        if not self.current_user.has_permission(payment.site_id, Permission.PAYMENT_RECORD):
            raise RefusedError("payments_forbidden", 403)
        if payment.status != PaymentStatus.PENDING:
            raise RefusedError("movement_not_pending")
        self._check_links(payment.site_id, payment.client_id, lot_links, payment.amount)
        self._replace_links(payment, lot_links)
        record_audit_event(self.db, self.current_user.id, PAYMENT_LINKED_ACTION, site_id=payment.site_id, entity_type="payment", entity_id=payment.id, after={"lots": [str(link.lot_id) for link in lot_links]})
        self.db.commit()
        return build_movement_views(self.db, self.storage, [payment])[0]

    def add_documents(self, payment_id: UUID, documents: list[PaymentDocumentIn]) -> MovementOut:
        """
        Add Proofs to a Payment.

        Args:
            payment_id (UUID): Payment proved.
            documents (list[PaymentDocumentIn]): Proofs as data URLs.

        Returns:
            MovementOut: The Payment with its Proofs.

        Raises:
            RefusedError: payment_not_found, payments_forbidden, document_invalid.
        """
        payment = self._get_payment(payment_id)
        if not self.current_user.has_permission(payment.site_id, Permission.DOCUMENT_ADD):
            raise RefusedError("payments_forbidden", 403)
        self._add_documents(payment, documents)
        record_audit_event(self.db, self.current_user.id, PAYMENT_DOCUMENTS_ADDED_ACTION, site_id=payment.site_id, entity_type="payment", entity_id=payment.id, after={"count": len(documents)})
        self.db.commit()
        return build_movement_views(self.db, self.storage, [payment])[0]

    def _settle(self, payment: Payment, settlement: Settlement, amount: Decimal, origin: SettlementOrigin) -> None:
        """
        Turn money the mill holds into a Credit Note on the Client's next Lots, or a Refund to make.

        Args:
            payment (Payment): Payment it comes from.
            settlement (Settlement): Credit Note or Refund.
            amount (Decimal): Amount held.
            origin (SettlementOrigin): Surplus or cancellation.
        """
        if settlement == Settlement.CREDIT_NOTE:
            self.db.add(CreditNote(site_id=payment.site_id, client_id=payment.client_id, origin=origin, source_payment_id=payment.id, amount=amount, created_by_id=self.current_user.id))
            return
        season = get_open_season(self.db)
        code = give_next_code(self.db, self.db.get(Site, payment.site_id), season, CodeKind.REFUND) if season else None
        self.db.add(Refund(code=code, site_id=payment.site_id, client_id=payment.client_id, origin=origin, source_payment_id=payment.id, amount=amount, created_by_id=self.current_user.id))

    def _check_links(self, site_id: UUID, client_id: UUID, lot_links: list[LotPaymentLinkIn], amount: Decimal) -> None:
        """
        Refuse Allocations above the Payment, or on a Lot of another Client or Site.

        Args:
            site_id (UUID): Payment's Site.
            client_id (UUID): Payment's Client.
            lot_links (list[LotPaymentLinkIn]): Allocations.
            amount (Decimal): Payment amount.

        Raises:
            RefusedError: links_too_high, lot_not_payable.
        """
        if sum((Decimal(str(link.amount)) for link in lot_links), Decimal(0)) > amount:
            raise RefusedError("links_too_high", 422)
        lot_ids = [link.lot_id for link in lot_links]
        if lot_ids and self.db.scalar(select(func.count()).select_from(Lot).where(Lot.id.in_(lot_ids), Lot.site_id == site_id, Lot.client_id == client_id)) != len(set(lot_ids)):
            raise RefusedError("lot_not_payable", 422)

    def _replace_links(self, payment: Payment, lot_links: list[LotPaymentLinkIn]) -> None:
        """
        Replace a Payment's Allocations.

        Args:
            payment (Payment): Payment to split.
            lot_links (list[LotPaymentLinkIn]): New Allocations.
        """
        self.db.execute(delete(PaymentAllocation).where(PaymentAllocation.payment_id == payment.id))
        self.db.add_all([PaymentAllocation(payment_id=payment.id, lot_id=link.lot_id, amount=Decimal(str(link.amount)), created_by_id=self.current_user.id) for link in lot_links])

    def _add_documents(self, payment: Payment, documents: list[PaymentDocumentIn]) -> None:
        """
        Store Proofs in the private bucket and attach them to a Payment.

        Args:
            payment (Payment): Payment proved.
            documents (list[PaymentDocumentIn]): Proofs as data URLs.
        """
        for document in documents:
            file = store_private_file(self.db, self.storage, document.url, document.name, self.current_user.id)
            self.db.flush()
            self.db.add(PaymentProof(file_id=file.id, payment_id=payment.id, created_by_id=self.current_user.id))

    def _parse_method(self, method: str) -> PaymentMethod:
        """
        Read a Payment Method key.

        Args:
            method (str): cash, cheque, transfer or oil.

        Returns:
            PaymentMethod: The method.

        Raises:
            RefusedError: method_invalid.
        """
        try:
            return PaymentMethod(method)
        except ValueError as error:
            raise RefusedError("method_invalid", 422) from error

    def _get_payment(self, payment_id: UUID) -> Payment:
        """
        Load a Payment the caller may see.

        Args:
            payment_id (UUID): Payment id.

        Returns:
            Payment: The Payment.

        Raises:
            RefusedError: payment_not_found, site_forbidden.
        """
        payment = self.db.get(Payment, payment_id)
        if payment is None:
            raise RefusedError("payment_not_found", 404)
        resolve_site_ids(self.db, self.current_user, [payment.site_id])
        return payment


def get_payment_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user), storage: RustFSClient = Depends(get_rustfs_client)) -> PaymentService:
    """
    Build the payment service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.
        storage (RustFSClient): Shared RustFS client.

    Returns:
        PaymentService: Service bound to the session, actor and storage.
    """
    return PaymentService(db, current_user, storage)
