from fastapi import APIRouter, Depends

from modules.site.services.season_illustration_services import SeasonIllustrationService, get_season_illustration_service
from modules.site.types.site_types import SeasonIllustrationOut


router = APIRouter(prefix="/season-illustrations", tags=["season"])


@router.get("", response_model=list[SeasonIllustrationOut])
def list_season_illustrations(season_illustration_service: SeasonIllustrationService = Depends(get_season_illustration_service)) -> list[SeasonIllustrationOut]:
    """
    List the Season Illustrations a Season can pick, newest code first.

    Args:
        season_illustration_service (SeasonIllustrationService): Injected Season Illustration service.

    Returns:
        list[SeasonIllustrationOut]: The available Season Illustrations.
    """
    return season_illustration_service.list_illustrations()
