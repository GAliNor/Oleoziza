from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.exceptions import RefusedError
from core.types import CurrentUser
from modules.site.models.site_models import Site


def resolve_site_ids(db: Session, current_user: CurrentUser, requested_site_ids: list[UUID]) -> list[UUID]:
    """
    Turn a request's repeated siteId into the Sites it covers: the ones asked for, or every Site the caller holds when none is asked, so « Tous les sites » is one request.

    Args:
        db (Session): Session to read Sites with.
        current_user (CurrentUser): Signed-in User.
        requested_site_ids (list[UUID]): Sites named in the request, possibly none.

    Returns:
        list[UUID]: The Sites to read, in a stable order.

    Raises:
        RefusedError: site_not_found for an unknown Site, site_forbidden for one the caller doesn't hold.
    """
    held_site_ids = list(db.scalars(select(Site.id).order_by(Site.code))) if current_user.is_owner else [UUID(site_id) for site_id in current_user.permissions_by_site]
    if not requested_site_ids:
        return held_site_ids
    known_site_ids = set(db.scalars(select(Site.id).where(Site.id.in_(requested_site_ids))))
    if set(requested_site_ids) - known_site_ids:
        raise RefusedError("site_not_found", 404)
    if set(requested_site_ids) - set(held_site_ids):
        raise RefusedError("site_forbidden", 403)
    return list(dict.fromkeys(requested_site_ids))
