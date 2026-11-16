from uuid import UUID

from fastapi import APIRouter, Depends, Query

from modules.finance.services.discount_services import DiscountService, get_discount_service
from modules.lot.services.lot_move_services import LotMoveService, get_lot_move_service
from modules.lot.services.lot_services import LotService, get_lot_service
from modules.lot.types.lot_types import DiscountDecisionIn, DiscountGiftIn, LotMoveIn, LotOut, LotReceiveIn, LotScheduleIn


router = APIRouter(prefix="/lots", tags=["lot"])


@router.get("", response_model=list[LotOut])
def list_lots(
    site_ids: list[UUID] = Query(default=[], alias="siteId"),
    season_id: UUID | None = Query(default=None, alias="seasonId"),
    lot_service: LotService = Depends(get_lot_service),
) -> list[LotOut]:
    """
    List the Lots of one Season on the Sites asked for (every Site held when none), newest first.

    Args:
        site_ids (list[UUID]): Repeated siteId.
        season_id (UUID | None): Season, the open one when omitted.
        lot_service (LotService): Injected lot service.

    Returns:
        list[LotOut]: The Lots.
    """
    return lot_service.list_lots(site_ids, season_id)


@router.post("", response_model=LotOut)
def receive_lot(payload: LotReceiveIn, lot_service: LotService = Depends(get_lot_service)) -> LotOut:
    """
    Save one Reception as a waiting Lot (reception.create); a replay answers the same Lot.

    Args:
        payload (LotReceiveIn): The Reception.
        lot_service (LotService): Injected lot service.

    Returns:
        LotOut: The Lot as saved.
    """
    return lot_service.receive_lot(payload)


@router.get("/{lot_id}", response_model=LotOut)
def get_lot(lot_id: UUID, lot_service: LotService = Depends(get_lot_service)) -> LotOut:
    """
    Read one Lot.

    Args:
        lot_id (UUID): Lot to read.
        lot_service (LotService): Injected lot service.

    Returns:
        LotOut: The Lot.
    """
    return lot_service.get_lot(lot_id)


@router.post("/{lot_id}/moves", response_model=LotOut)
def move_lot(lot_id: UUID, payload: LotMoveIn, lot_move_service: LotMoveService = Depends(get_lot_move_service)) -> LotOut:
    """
    Move a Lot one step along its statuses; a replayed step changes nothing.

    Args:
        lot_id (UUID): Lot to move.
        payload (LotMoveIn): The step.
        lot_move_service (LotMoveService): Injected lot move service.

    Returns:
        LotOut: The Lot after the step.
    """
    return lot_move_service.move_lot(lot_id, payload)


@router.put("/{lot_id}/schedule", response_model=LotOut)
def schedule_lot(lot_id: UUID, payload: LotScheduleIn, lot_move_service: LotMoveService = Depends(get_lot_move_service)) -> LotOut:
    """
    Plan a waiting Lot on another Press Line or start.

    Args:
        lot_id (UUID): Lot to plan.
        payload (LotScheduleIn): Line and start.
        lot_move_service (LotMoveService): Injected lot move service.

    Returns:
        LotOut: The Lot as planned.
    """
    return lot_move_service.schedule_lot(lot_id, payload)


@router.post("/{lot_id}/discount", response_model=LotOut)
def give_discount(lot_id: UUID, payload: DiscountGiftIn, discount_service: DiscountService = Depends(get_discount_service)) -> LotOut:
    """
    Give a Discount on a Lot's Milling Fee (discount.give).

    Args:
        lot_id (UUID): Lot reduced.
        payload (DiscountGiftIn): Amount and percent.
        discount_service (DiscountService): Injected discount service.

    Returns:
        LotOut: The Lot with its Discount.
    """
    return discount_service.give_discount(lot_id, payload)


@router.post("/{lot_id}/discount/decision", response_model=LotOut)
def decide_discount(lot_id: UUID, payload: DiscountDecisionIn, discount_service: DiscountService = Depends(get_discount_service)) -> LotOut:
    """
    Approve or refuse a Discount above the limit (discount.approve).

    Args:
        lot_id (UUID): Lot reduced.
        payload (DiscountDecisionIn): The decision.
        discount_service (DiscountService): Injected discount service.

    Returns:
        LotOut: The Lot after the decision.
    """
    return discount_service.decide_discount(lot_id, payload)


@router.post("/{lot_id}/contact-found", response_model=LotOut)
def mark_contact_found(lot_id: UUID, lot_service: LotService = Depends(get_lot_service)) -> LotOut:
    """
    Read a Lot again once its Client's contact was added: the missing-contact flag is derived, so it clears by itself.

    Args:
        lot_id (UUID): Lot to read.
        lot_service (LotService): Injected lot service.

    Returns:
        LotOut: The Lot.
    """
    return lot_service.get_lot(lot_id)
