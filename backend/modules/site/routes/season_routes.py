from uuid import UUID

from fastapi import APIRouter, Body, Depends, File, Query, UploadFile, status

from modules.site.services.season_correction_services import SeasonCorrectionService, get_season_correction_service
from modules.site.services.season_date_services import SeasonDateService, get_season_date_service
from modules.site.services.season_services import SeasonService, get_season_service
from modules.site.types.site_types import SeasonArtVariant, SeasonDatesIn, SeasonIllustrationChoiceIn, SeasonOut


router = APIRouter(prefix="/seasons", tags=["season"])


@router.get("", response_model=list[SeasonOut])
def list_seasons(season_service: SeasonService = Depends(get_season_service)) -> list[SeasonOut]:
    """
    List every Season, oldest first.

    Args:
        season_service (SeasonService): Injected season service.

    Returns:
        list[SeasonOut]: The Seasons.
    """
    return season_service.list_seasons()


@router.post("", response_model=SeasonOut, status_code=status.HTTP_201_CREATED)
def prepare_next_season(choice: SeasonIllustrationChoiceIn | None = Body(default=None), season_service: SeasonService = Depends(get_season_service)) -> SeasonOut:
    """
    Prepare the next Season with the prices carried over, using the Season Illustration picked, if any.

    Args:
        choice (SeasonIllustrationChoiceIn | None): Season Illustration picked; no body for none.
        season_service (SeasonService): Injected season service.

    Returns:
        SeasonOut: The planned Season.
    """
    return season_service.prepare_next_season(choice.season_illustration_id if choice else None)


@router.put("/{season_id}/season-illustration", response_model=SeasonOut)
def choose_season_illustration(season_id: UUID, choice: SeasonIllustrationChoiceIn, season_service: SeasonService = Depends(get_season_service)) -> SeasonOut:
    """
    Make a Season use one of the available Season Illustrations, or none.

    Args:
        season_id (UUID): Season illustrated.
        choice (SeasonIllustrationChoiceIn): Season Illustration picked, null for none.
        season_service (SeasonService): Injected season service.

    Returns:
        SeasonOut: The Season with its banner URLs.
    """
    return season_service.choose_illustration(season_id, choice.season_illustration_id)


@router.put("/{season_id}/dates", response_model=SeasonOut)
def set_season_dates(season_id: UUID, dates: SeasonDatesIn, season_date_service: SeasonDateService = Depends(get_season_date_service)) -> SeasonOut:
    """
    Move the first or last day of a prepared or open Season.

    Args:
        season_id (UUID): Season moved.
        dates (SeasonDatesIn): Its first and last day.
        season_date_service (SeasonDateService): Injected season date service.

    Returns:
        SeasonOut: The Season with its new dates.
    """
    return season_date_service.set_dates(season_id, dates)


@router.post("/{season_id}/open", response_model=SeasonOut)
def open_season(season_id: UUID, season_service: SeasonService = Depends(get_season_service)) -> SeasonOut:
    """
    Open the prepared Season, closing the one under way.

    Args:
        season_id (UUID): Planned Season.
        season_service (SeasonService): Injected season service.

    Returns:
        SeasonOut: The opened Season.
    """
    return season_service.open_season(season_id)


@router.post("/{season_id}/close", response_model=SeasonOut)
def close_season(season_id: UUID, season_service: SeasonService = Depends(get_season_service)) -> SeasonOut:
    """
    Close the Season under way.

    Args:
        season_id (UUID): Open Season.
        season_service (SeasonService): Injected season service.

    Returns:
        SeasonOut: The closed Season.
    """
    return season_service.close_season(season_id)


@router.post("/{season_id}/reopen", response_model=SeasonOut)
def reopen_season(season_id: UUID, season_correction_service: SeasonCorrectionService = Depends(get_season_correction_service)) -> SeasonOut:
    """
    Open the latest closed Season again, Owner only.

    Args:
        season_id (UUID): Closed Season.
        season_correction_service (SeasonCorrectionService): Injected service.

    Returns:
        SeasonOut: The Season, open.
    """
    return season_correction_service.reopen_season(season_id)


@router.delete("/{season_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_season(season_id: UUID, season_correction_service: SeasonCorrectionService = Depends(get_season_correction_service)) -> None:
    """
    Delete a Season nothing was recorded in, Owner only.

    Args:
        season_id (UUID): Season.
        season_correction_service (SeasonCorrectionService): Injected service.
    """
    season_correction_service.delete_season(season_id)


@router.put("/{season_id}/illustration", response_model=SeasonOut)
def upload_illustration(
    season_id: UUID,
    file: UploadFile = File(...),
    variant: SeasonArtVariant = Query(default=SeasonArtVariant.LIGHT),
    season_service: SeasonService = Depends(get_season_service),
) -> SeasonOut:
    """
    Upload a Season's banner, the daylight one or the dusk one for dark mode.

    Args:
        season_id (UUID): Season illustrated.
        file (UploadFile): WebP, PNG or JPEG image.
        variant (SeasonArtVariant): light or dark.
        season_service (SeasonService): Injected season service.

    Returns:
        SeasonOut: The Season with its banner URLs.
    """
    return season_service.upload_illustration(season_id, variant, file)
