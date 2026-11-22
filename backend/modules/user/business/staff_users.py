from sqlalchemy import func, select
from sqlalchemy.orm import Session

from modules.auth.models.auth_models import Invitation
from modules.site.models.site_models import Site
from modules.site.types.site_types import SiteStatus
from modules.user.models.user_models import SiteAssignment, SiteAssignmentPermission, User, UserLoginMethod
from modules.user.types.user_types import LocationOut, LoginMethod, Permission, StaffUserOut


def list_site_permissions(db: Session, user: User) -> dict[str, list[Permission]]:
    """
    Gather the Permissions a staff User holds per Site; the Owner holds every Permission on every active Site without any Site Assignment (rule A5).

    Args:
        db (Session): Database session.
        user (User): User to read.

    Returns:
        dict[str, list[Permission]]: Permissions per Site id, as text.
    """
    if user.is_owner:
        site_ids = db.scalars(select(Site.id).where(Site.status == SiteStatus.ACTIVE)).all()
        return {str(site_id): list(Permission) for site_id in site_ids}
    rows = db.execute(
        select(SiteAssignment.site_id, SiteAssignmentPermission.permission)
        .outerjoin(SiteAssignmentPermission, SiteAssignmentPermission.site_assignment_id == SiteAssignment.id)
        .where(SiteAssignment.user_id == user.id)
    ).all()
    sites: dict[str, list[Permission]] = {}
    for site_id, permission in rows:
        site_permissions = sites.setdefault(str(site_id), [])
        if permission is not None:
            site_permissions.append(permission)
    return sites


def build_staff_user(db: Session, user: User, visible_site_ids: set[str] | None) -> StaffUserOut:
    """
    Shape a staff User as the Users page shows it, with Permissions per Site and the last Invitation date.

    Args:
        db (Session): Database session.
        user (User): User to show.
        visible_site_ids (set[str] | None): Sites the viewer may see, None for every Site.

    Returns:
        StaffUserOut: The User as the front reads it.
    """
    sites = list_site_permissions(db, user)
    if visible_site_ids is not None:
        sites = {site_id: permissions for site_id, permissions in sites.items() if site_id in visible_site_ids}
    login_methods = db.scalars(select(UserLoginMethod.method).where(UserLoginMethod.user_id == user.id)).all()
    invited_at = db.scalar(select(func.max(Invitation.created_at)).where(Invitation.user_id == user.id))
    location = LocationOut(province=user.province_id, city=user.city or "", address=user.address or "") if user.province_id else None
    return StaffUserOut(
        id=user.id,
        role=user.role,
        is_owner=user.is_owner,
        title=user.title,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        email=user.email,
        location=location,
        login_methods=[method for method in LoginMethod if method in login_methods],
        status=user.status,
        sites=sites,
        last_login_at=user.last_login_at,
        invited_at=invited_at,
    )
