from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from modules.user.services.user_profile_services import UserProfileService, get_user_profile_service
from modules.user.services.user_services import UserService, get_user_service
from modules.user.types.user_secret_types import SecretIn
from modules.user.types.user_types import ContactCheckOut, LoginMethodsIn, OwnershipIn, RoleIn, SitePermissionsIn, StaffProfileIn, StaffUserCreateIn, StaffUserOut, StatusIn


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


@router.get("/contact-check", response_model=ContactCheckOut)
def check_contacts(phone: str | None = None, email: str | None = None, except_user_id: UUID | None = Query(default=None, alias="exceptUserId"), profile_service: UserProfileService = Depends(get_user_profile_service)) -> ContactCheckOut:
    """
    Tell who already logs in with a phone or an email, while it is typed.

    Args:
        phone (str | None): Phone typed.
        email (str | None): Email typed.
        except_user_id (UUID | None): User being edited.
        profile_service (UserProfileService): Injected service.

    Returns:
        ContactCheckOut: Who holds each, null when free.
    """
    return profile_service.check_contacts(phone, email, except_user_id)


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


@router.put("/{user_id}/profile", response_model=StaffUserOut)
def update_profile(user_id: UUID, payload: StaffProfileIn, profile_service: UserProfileService = Depends(get_user_profile_service)) -> StaffUserOut:
    """
    Change a staff User's civility, names, phone and email.

    Args:
        user_id (UUID): User changed.
        payload (StaffProfileIn): The profile.
        profile_service (UserProfileService): Injected service.

    Returns:
        StaffUserOut: The User after the change.
    """
    return profile_service.update_profile(user_id, payload)


@router.put("/{user_id}/role", response_model=StaffUserOut)
def set_role(user_id: UUID, payload: RoleIn, profile_service: UserProfileService = Depends(get_user_profile_service)) -> StaffUserOut:
    """
    Give a staff User another Role, Owner only.

    Args:
        user_id (UUID): User changed.
        payload (RoleIn): The Role.
        profile_service (UserProfileService): Injected service.

    Returns:
        StaffUserOut: The User after the change.
    """
    return profile_service.set_role(user_id, payload)


@router.put("/{user_id}/secret", response_model=StaffUserOut)
def set_secret(user_id: UUID, payload: SecretIn, profile_service: UserProfileService = Depends(get_user_profile_service)) -> StaffUserOut:
    """
    Set a staff User's PIN or password, Owner only.

    Args:
        user_id (UUID): User changed.
        payload (SecretIn): PIN or password.
        profile_service (UserProfileService): Injected service.

    Returns:
        StaffUserOut: The User after the change.
    """
    return profile_service.set_secret(user_id, payload)


@router.put("/{user_id}/ownership", response_model=StaffUserOut)
def set_ownership(user_id: UUID, payload: OwnershipIn, profile_service: UserProfileService = Depends(get_user_profile_service)) -> StaffUserOut:
    """
    Make a Management User an Owner, or withdraw it, Owner only.

    Args:
        user_id (UUID): User changed.
        payload (OwnershipIn): Owner or not.
        profile_service (UserProfileService): Injected service.

    Returns:
        StaffUserOut: The User after the change.
    """
    return profile_service.set_ownership(user_id, payload)


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
