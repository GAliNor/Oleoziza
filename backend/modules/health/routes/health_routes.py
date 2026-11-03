from fastapi import APIRouter, Depends

from modules.health.services.health_services import HealthService, get_health_service
from modules.health.types.health_types import HealthOut


router = APIRouter(tags=["health"])


@router.get("", response_model=HealthOut)
def get_health(health_service: HealthService = Depends(get_health_service)) -> HealthOut:
    """
    Expose the API and database health.

    Args:
        health_service (HealthService): Injected health service.

    Returns:
        HealthOut: Overall status and database reachability.
    """
    return health_service.get_health()
