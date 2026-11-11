from uuid import UUID

from fastapi import APIRouter, Depends, status

from modules.user.services.user_services import UserService, get_user_service
from modules.user.types.user_types import LoginMethodsIn, SitePermissionsIn, StaffUserCreateIn, StaffUserOut, StatusIn


router = APIRouter(tags=["user"])


@router.get("", response_model=list[StaffUserOut])
def list_staff(user_service: UserService = Depends(get_user_service)) -> list[StaffUserOut]:
    """
    List the staff Users for the Users page.

    Args:
        user_service (UserService): Injected user service.

    Returns:
        list[StaffUserOut]: Staff Users.
    """
    return user_service.list_staff()


@router.post("", response_model=StaffUserOut, status_code=status.HTTP_201_CREATED)
def create_staff_user(payload: StaffUserCreateIn, user_service: UserService = Depends(get_user_service)) -> StaffUserOut:
    """
    Create a staff User with a first secret or an Invitation.

    Args:
        payload (StaffUserCreateIn): The new User.
        user_service (UserService): Injected user service.

    Returns:
        StaffUserOut: The created User.
    """
    return user_service.create_staff_user(payload)


@router.put("/{user_id}/sites/{site_id}", response_model=StaffUserOut)
def set_site_permissions(user_id: UUID, site_id: UUID, payload: SitePermissionsIn, user_service: UserService = Depends(get_user_service)) -> StaffUserOut:
    """
    Give a staff User a Site, or change their Permissions there.

    Args:
        user_id (UUID): User changed.
        site_id (UUID): Site concerned.
        payload (SitePermissionsIn): Permissions held there.
        user_service (UserService): Injected user service.

    Returns:
        StaffUserOut: The User after the change.
    """
    return user_service.set_site_permissions(user_id, site_id, payload.permissions)


@router.delete("/{user_id}/sites/{site_id}", response_model=StaffUserOut)
def remove_site(user_id: UUID, site_id: UUID, user_service: UserService = Depends(get_user_service)) -> StaffUserOut:
    """
    Take a Site away from a staff User, who keeps at least one.

    Args:
        user_id (UUID): User changed.
        site_id (UUID): Site taken away.
        user_service (UserService): Injected user service.

    Returns:
        StaffUserOut: The User after the change.
    """
    return user_service.set_site_permissions(user_id, site_id, None)


@router.put("/{user_id}/login-methods", response_model=StaffUserOut)
def set_login_methods(user_id: UUID, payload: LoginMethodsIn, user_service: UserService = Depends(get_user_service)) -> StaffUserOut:
    """
    Choose how a staff User may log in.

    Args:
        user_id (UUID): User changed.
        payload (LoginMethodsIn): Allowed methods.
        user_service (UserService): Injected user service.

    Returns:
        StaffUserOut: The User after the change.
    """
    return user_service.set_login_methods(user_id, payload.login_methods)


@router.put("/{user_id}/status", response_model=StaffUserOut)
def set_status(user_id: UUID, payload: StatusIn, user_service: UserService = Depends(get_user_service)) -> StaffUserOut:
    """
    Disable or enable a staff User.

    Args:
        user_id (UUID): User changed.
        payload (StatusIn): active or disabled.
        user_service (UserService): Injected user service.

    Returns:
        StaffUserOut: The User after the change.
    """
    return user_service.set_status(user_id, payload.status)


@router.post("/{user_id}/invitation", response_model=StaffUserOut)
def send_invitation(user_id: UUID, user_service: UserService = Depends(get_user_service)) -> StaffUserOut:
    """
    Send a new Invitation to a staff User still invited.

    Args:
        user_id (UUID): Invited User.
        user_service (UserService): Injected user service.

    Returns:
        StaffUserOut: The User with the new invitation date.
    """
    return user_service.send_invitation(user_id)


@router.post("/{user_id}/reset", status_code=status.HTTP_204_NO_CONTENT)
def reset_credential(user_id: UUID, user_service: UserService = Depends(get_user_service)) -> None:
    """
    Send an active staff User a link to choose a new secret.

    Args:
        user_id (UUID): User whose secret is reset.
        user_service (UserService): Injected user service.
    """
    user_service.reset_credential(user_id)
