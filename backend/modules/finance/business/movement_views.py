from collections import defaultdict
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.integrations.rustfs.rustfs_client import RustFSClient
from modules.client.models.client_models import Client
from modules.file.models.file_models import File
from modules.finance.models.finance_models import CreditNote, Payment, PaymentAllocation, PaymentProof, Refund
from modules.finance.types.finance_types import LotPaymentLinkOut, MovementOut, PaymentDocumentOut, RefundOut, Settlement
from modules.lot.business.lot_views import list_user_names
from modules.lot.models.lot_models import Lot


def build_movement_views(db: Session, storage: RustFSClient, payments: list[Payment]) -> list[MovementOut]:
    """
    Shape many Payments for the screens in a fixed number of queries: Clients, Allocations with Lot codes, Proofs, settlements and names.

    Args:
        db (Session): Session to read with.
        storage (RustFSClient): RustFS client, to sign the Proofs' URLs.
        payments (list[Payment]): Payment rows.

    Returns:
        list[MovementOut]: The Payments in the same order.
    """
    if not payments:
        return []
    payment_ids = [payment.id for payment in payments]
    clients = {client.id: client for client in db.scalars(select(Client).where(Client.id.in_({payment.client_id for payment in payments})))}
    links: dict[UUID, list[LotPaymentLinkOut]] = defaultdict(list)
    for allocation, lot_code in db.execute(select(PaymentAllocation, Lot.code).join(Lot, Lot.id == PaymentAllocation.lot_id).where(PaymentAllocation.payment_id.in_(payment_ids))):
        links[allocation.payment_id].append(LotPaymentLinkOut(lot_id=allocation.lot_id, lot_code=lot_code or "", amount=float(allocation.amount)))
    proofs = list_proofs(db, storage, PaymentProof.payment_id, payment_ids)
    settlements = {payment_id: Settlement.CREDIT_NOTE for payment_id in db.scalars(select(CreditNote.source_payment_id).where(CreditNote.source_payment_id.in_(payment_ids)))}
    settlements |= {payment_id: Settlement.REFUND for payment_id in db.scalars(select(Refund.source_payment_id).where(Refund.source_payment_id.in_(payment_ids)))}
    names = list_user_names(db, {user_id for payment in payments for user_id in (payment.created_by_id, payment.decided_by_id) if user_id})
    return [
        MovementOut(
            id=payment.id,
            code=payment.code or "",
            site_id=payment.site_id,
            client_id=payment.client_id,
            client=clients[payment.client_id].display_name if payment.client_id in clients else "",
            lot_links=links.get(payment.id, []),
            amount=float(payment.amount),
            method=payment.method.value,
            reference=payment.reference or payment.cheque_number,
            oil_litres=float(payment.oil_in_litres) if payment.oil_in_litres is not None else None,
            documents=proofs.get(payment.id, []),
            status=payment.status,
            recorded_by=names.get(payment.created_by_id, "") if payment.created_by_id else "",
            recorded_at=payment.entered_at,
            was_offline=payment.was_recorded_offline,
            decided_by=names.get(payment.decided_by_id) if payment.decided_by_id else None,
            decided_at=payment.decided_at,
            note=payment.decision_note,
            settlement=settlements.get(payment.id),
        )
        for payment in payments
    ]


def build_refund_views(db: Session, storage: RustFSClient, refunds: list[Refund]) -> list[RefundOut]:
    """
    Shape many Refunds for the screens in a fixed number of queries.

    Args:
        db (Session): Session to read with.
        storage (RustFSClient): RustFS client, to sign the Proofs' URLs.
        refunds (list[Refund]): Refund rows.

    Returns:
        list[RefundOut]: The Refunds in the same order.
    """
    if not refunds:
        return []
    refund_ids = [refund.id for refund in refunds]
    clients = {client.id: client for client in db.scalars(select(Client).where(Client.id.in_({refund.client_id for refund in refunds})))}
    source_codes = {payment_id: code for payment_id, code in db.execute(select(Payment.id, Payment.code).where(Payment.id.in_({refund.source_payment_id for refund in refunds})))}
    proofs = list_proofs(db, storage, PaymentProof.refund_id, refund_ids)
    names = list_user_names(db, {user_id for refund in refunds for user_id in (refund.made_by_id, refund.confirmed_by_id) if user_id})
    return [
        RefundOut(
            id=refund.id,
            site_id=refund.site_id,
            client_id=refund.client_id,
            client=clients[refund.client_id].display_name if refund.client_id in clients else "",
            source_code=source_codes.get(refund.source_payment_id) or "",
            amount=float(refund.amount),
            status=refund.status,
            created_at=refund.created_at,
            method=refund.method.value if refund.method else None,
            reference=refund.reference,
            documents=proofs.get(refund.id, []),
            made_by=names.get(refund.made_by_id) if refund.made_by_id else None,
            made_at=refund.made_at,
            confirmed_by=names.get(refund.confirmed_by_id) if refund.confirmed_by_id else None,
            confirmed_at=refund.confirmed_at,
        )
        for refund in refunds
    ]


def list_proofs(db: Session, storage: RustFSClient, owner_column: object, owner_ids: list[UUID]) -> dict[UUID, list[PaymentDocumentOut]]:
    """
    Read the Proofs of many Payments or Refunds in one query, each with a signed URL.

    Args:
        db (Session): Session to read with.
        storage (RustFSClient): RustFS client.
        owner_column (object): `PaymentProof.payment_id` or `PaymentProof.refund_id`.
        owner_ids (list[UUID]): Payments or Refunds to read.

    Returns:
        dict[UUID, list[PaymentDocumentOut]]: Proofs per owner.
    """
    rows = db.execute(select(owner_column, File).join(File, File.id == PaymentProof.file_id).where(owner_column.in_(owner_ids))).all()
    names = list_user_names(db, {file.created_by_id for _, file in rows if file.created_by_id})
    proofs: dict[UUID, list[PaymentDocumentOut]] = defaultdict(list)
    for owner_id, file in rows:
        proofs[owner_id].append(
            PaymentDocumentOut(id=file.id, name=file.original_name, url=storage.build_signed_url(file.storage_key), is_pdf=file.content_type == "application/pdf", added_by=names.get(file.created_by_id, "") if file.created_by_id else "", added_at=file.created_at)
        )
    return proofs
