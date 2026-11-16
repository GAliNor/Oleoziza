from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from modules.finance.services.finance_desk_services import FinanceDeskService, get_finance_desk_service
from modules.finance.services.payment_services import PaymentService, get_payment_service
from modules.finance.types.finance_types import (
    DebtContactIn,
    DebtContactOut,
    LotPaymentLinkIn,
    MovementDecisionIn,
    MovementOut,
    MovementPageOut,
    PaymentDocumentIn,
    PaymentRecordIn,
    RefundMadeIn,
    RefundOut,
    RefundPageOut,
    SalesOut,
)


router = APIRouter(tags=["finance"])

PAGE_SIZE = 25

MAX_PAGE_SIZE = 100


@router.get("/payments", response_model=list[MovementOut])
def list_payments(site_ids: list[UUID] = Query(default=[], alias="siteId"), payment_service: PaymentService = Depends(get_payment_service)) -> list[MovementOut]:
    """
    List the Payments of the open Season on the Sites asked for.

    Args:
        site_ids (list[UUID]): Repeated siteId.
        payment_service (PaymentService): Injected payment service.

    Returns:
        list[MovementOut]: The Payments, newest first.
    """
    return payment_service.list_payments(site_ids)


@router.get("/payments/page", response_model=MovementPageOut)
def page_payments(
    site_ids: list[UUID] = Query(default=[], alias="siteId"),
    list_name: Literal["pending", "all"] = Query(default="all", alias="list"),
    search: str = "",
    period: str = "season",
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    payment_service: PaymentService = Depends(get_payment_service),
) -> MovementPageOut:
    """
    Read one page of the register: to confirm, or every Payment of the period.

    Args:
        site_ids (list[UUID]): Repeated siteId.
        list_name (str): pending or all.
        search (str): Client name or code.
        period (str): Period of the « all » list.
        offset (int): First row.
        limit (int): Rows per page.
        payment_service (PaymentService): Injected payment service.

    Returns:
        MovementPageOut: The page and the list's size.
    """
    items, total = payment_service.page_payments(site_ids, list_name == "pending", search, period, offset, limit)
    return MovementPageOut(items=items, total=total)


@router.post("/payments", response_model=MovementOut)
def record_payment(payload: PaymentRecordIn, payment_service: PaymentService = Depends(get_payment_service)) -> MovementOut:
    """
    Record a Payment (payment.record); a replay answers the same Payment.

    Args:
        payload (PaymentRecordIn): The Payment.
        payment_service (PaymentService): Injected payment service.

    Returns:
        MovementOut: The Payment.
    """
    return payment_service.record_payment(payload)


@router.post("/payments/{payment_id}/decision", response_model=MovementOut)
def decide_payment(payment_id: UUID, payload: MovementDecisionIn, payment_service: PaymentService = Depends(get_payment_service)) -> MovementOut:
    """
    Confirm, reject or cancel a Payment.

    Args:
        payment_id (UUID): Payment decided.
        payload (MovementDecisionIn): The decision.
        payment_service (PaymentService): Injected payment service.

    Returns:
        MovementOut: The Payment.
    """
    return payment_service.decide_payment(payment_id, payload)


@router.put("/payments/{payment_id}/lots", response_model=MovementOut)
def link_lots(payment_id: UUID, payload: list[LotPaymentLinkIn], payment_service: PaymentService = Depends(get_payment_service)) -> MovementOut:
    """
    Change which Lots a pending Payment pays.

    Args:
        payment_id (UUID): Payment to split.
        payload (list[LotPaymentLinkIn]): New Allocations.
        payment_service (PaymentService): Injected payment service.

    Returns:
        MovementOut: The Payment.
    """
    return payment_service.link_lots(payment_id, payload)


@router.post("/payments/{payment_id}/documents", response_model=MovementOut)
def add_documents(payment_id: UUID, payload: list[PaymentDocumentIn], payment_service: PaymentService = Depends(get_payment_service)) -> MovementOut:
    """
    Add Proofs to a Payment (document.add).

    Args:
        payment_id (UUID): Payment proved.
        payload (list[PaymentDocumentIn]): Proofs as data URLs.
        payment_service (PaymentService): Injected payment service.

    Returns:
        MovementOut: The Payment.
    """
    return payment_service.add_documents(payment_id, payload)


@router.get("/refunds", response_model=list[RefundOut])
def list_refunds(site_ids: list[UUID] = Query(default=[], alias="siteId"), desk_service: FinanceDeskService = Depends(get_finance_desk_service)) -> list[RefundOut]:
    """
    List every Refund of the Sites asked for.

    Args:
        site_ids (list[UUID]): Repeated siteId.
        desk_service (FinanceDeskService): Injected finance desk service.

    Returns:
        list[RefundOut]: The Refunds.
    """
    return desk_service.list_refunds(site_ids)[0]


@router.get("/refunds/page", response_model=RefundPageOut)
def page_refunds(
    site_ids: list[UUID] = Query(default=[], alias="siteId"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    desk_service: FinanceDeskService = Depends(get_finance_desk_service),
) -> RefundPageOut:
    """
    Read one page of the Refunds.

    Args:
        site_ids (list[UUID]): Repeated siteId.
        offset (int): First row.
        limit (int): Rows per page.
        desk_service (FinanceDeskService): Injected finance desk service.

    Returns:
        RefundPageOut: The page and the list's size.
    """
    items, total = desk_service.list_refunds(site_ids, offset, limit)
    return RefundPageOut(items=items, total=total)


@router.post("/refunds/{refund_id}/made", response_model=RefundOut)
def make_refund(refund_id: UUID, payload: RefundMadeIn, desk_service: FinanceDeskService = Depends(get_finance_desk_service)) -> RefundOut:
    """
    Record that a Refund was paid back (refund.manage).

    Args:
        refund_id (UUID): Refund.
        payload (RefundMadeIn): Method, reference and Proofs.
        desk_service (FinanceDeskService): Injected finance desk service.

    Returns:
        RefundOut: The Refund.
    """
    return desk_service.make_refund(refund_id, payload)


@router.post("/refunds/{refund_id}/confirm", response_model=RefundOut)
def confirm_refund(refund_id: UUID, desk_service: FinanceDeskService = Depends(get_finance_desk_service)) -> RefundOut:
    """
    Confirm a Refund made by someone else (refund.manage).

    Args:
        refund_id (UUID): Refund.
        desk_service (FinanceDeskService): Injected finance desk service.

    Returns:
        RefundOut: The Refund.
    """
    return desk_service.confirm_refund(refund_id)


@router.get("/debt-contacts", response_model=list[DebtContactOut])
def list_debt_contacts(site_ids: list[UUID] = Query(default=[], alias="siteId"), desk_service: FinanceDeskService = Depends(get_finance_desk_service)) -> list[DebtContactOut]:
    """
    List the Debt Follow-up's contacts.

    Args:
        site_ids (list[UUID]): Repeated siteId.
        desk_service (FinanceDeskService): Injected finance desk service.

    Returns:
        list[DebtContactOut]: The contacts.
    """
    return desk_service.list_debt_contacts(site_ids)


@router.post("/debt-contacts", response_model=DebtContactOut)
def add_debt_contact(payload: DebtContactIn, desk_service: FinanceDeskService = Depends(get_finance_desk_service)) -> DebtContactOut:
    """
    Log a contact with a Client who owes (debt.follow); a replay answers the same contact.

    Args:
        payload (DebtContactIn): The contact.
        desk_service (FinanceDeskService): Injected finance desk service.

    Returns:
        DebtContactOut: The contact.
    """
    return desk_service.add_debt_contact(payload)


@router.get("/sales", response_model=SalesOut)
def get_sales(site_ids: list[UUID] = Query(default=[], alias="siteId"), period: str = "season", desk_service: FinanceDeskService = Depends(get_finance_desk_service)) -> SalesOut:
    """
    Compute the Finances tab for a period.

    Args:
        site_ids (list[UUID]): Repeated siteId.
        period (str): today, week, month, season or previous.
        desk_service (FinanceDeskService): Injected finance desk service.

    Returns:
        SalesOut: Figures, buckets and methods.
    """
    return desk_service.get_sales(site_ids, period)
