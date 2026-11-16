from uuid import UUID

from fastapi import APIRouter, Depends, Query

from modules.dashboard.services.dashboard_services import DashboardService, get_dashboard_service
from modules.dashboard.types.dashboard_types import DashboardOut


router = APIRouter(tags=["dashboard"])


@router.get("", response_model=DashboardOut)
def get_dashboard(site_ids: list[UUID] = Query(default=[], alias="siteId"), period: str = "season", dashboard_service: DashboardService = Depends(get_dashboard_service)) -> DashboardOut:
    """
    Compute the Management Home in one request.

    Args:
        site_ids (list[UUID]): Repeated siteId, every Site held when none.
        period (str): today, week, month, season or previous.
        dashboard_service (DashboardService): Injected dashboard service.

    Returns:
        DashboardOut: The Home's figures.
    """
    return dashboard_service.get_dashboard(site_ids, period)
