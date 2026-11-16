from uuid import UUID

from fastapi import APIRouter, Depends, status

from modules.site.services.site_services import SiteService, get_site_service
from modules.site.types.site_types import SiteCreateIn, SiteOut, SiteUpdateIn


router = APIRouter(prefix="/sites", tags=["site"])


@router.get("", response_model=list[SiteOut])
def list_sites(site_service: SiteService = Depends(get_site_service)) -> list[SiteOut]:
    """
    List the mills the caller holds.

    Args:
        site_service (SiteService): Injected site service.

    Returns:
        list[SiteOut]: The Sites, by code.
    """
    return site_service.list_sites()


@router.post("", response_model=SiteOut, status_code=status.HTTP_201_CREATED)
def create_site(payload: SiteCreateIn, site_service: SiteService = Depends(get_site_service)) -> SiteOut:
    """
    Open a new mill (Owner only).

    Args:
        payload (SiteCreateIn): Code, name, Location and phone.
        site_service (SiteService): Injected site service.

    Returns:
        SiteOut: The new Site.
    """
    return site_service.create_site(payload)


@router.put("/{site_id}", response_model=SiteOut)
def update_site(site_id: UUID, payload: SiteUpdateIn, site_service: SiteService = Depends(get_site_service)) -> SiteOut:
    """
    Change a mill's name, Location or phone (site.manage).

    Args:
        site_id (UUID): Site to change.
        payload (SiteUpdateIn): New values.
        site_service (SiteService): Injected site service.

    Returns:
        SiteOut: The Site as saved.
    """
    return site_service.update_site(site_id, payload)


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_site(site_id: UUID, site_service: SiteService = Depends(get_site_service)) -> None:
    """
    Remove a mill that holds no record yet (Owner only).

    Args:
        site_id (UUID): Site to remove.
        site_service (SiteService): Injected site service.
    """
    site_service.delete_site(site_id)
