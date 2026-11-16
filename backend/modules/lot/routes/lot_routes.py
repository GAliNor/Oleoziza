from uuid import UUID

from fastapi import APIRouter, Depends, Query

from modules.lot.services.lot_services import LotService, get_lot_service
from modules.lot.types.lot_types import LotOut, LotReceiveIn


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
