from uuid import UUID

from fastapi import APIRouter, Depends, Query

from modules.task.services.task_services import TaskService, get_task_service
from modules.task.types.task_types import TaskOut


router = APIRouter(prefix="/tasks", tags=["task"])


@router.get("", response_model=list[TaskOut])
def list_tasks(site_ids: list[UUID] = Query(default=[], alias="siteId"), task_service: TaskService = Depends(get_task_service)) -> list[TaskOut]:
    """
    Read the caller's to-do list in one request.

    Args:
        site_ids (list[UUID]): Repeated siteId, every Site held when none.
        task_service (TaskService): Injected task service.

    Returns:
        list[TaskOut]: The tasks, oldest first.
    """
    return task_service.list_tasks(site_ids)
