from fastapi import APIRouter, Depends, Response

from core.http_cache import REFERENCE_CACHE_CONTROL
from core.security import get_current_user
from modules.territory.services.territory_services import TerritoryService, get_territory_service
from modules.territory.types.territory_types import ProvinceOut


router = APIRouter(tags=["territory"], dependencies=[Depends(get_current_user)])


@router.get("/provinces", response_model=list[ProvinceOut])
def list_provinces(response: Response, territory_service: TerritoryService = Depends(get_territory_service)) -> list[ProvinceOut]:
    """
    List the Provinces of the Oriental with their outlines and towns; reference data the browser keeps for a day.

    Args:
        response (Response): Answer whose cache header is set.
        territory_service (TerritoryService): Injected territory service.

    Returns:
        list[ProvinceOut]: Every Province with its towns.
    """
    response.headers["Cache-Control"] = REFERENCE_CACHE_CONTROL
    return territory_service.list_provinces()
