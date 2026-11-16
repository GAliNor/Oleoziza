from uuid import UUID

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.site.business.site_scope import resolve_site_ids
from modules.site.models.site_models import Site
from modules.site.types.site_types import SiteCreateIn, SiteOut, SiteUpdateIn
from modules.territory.models.territory_models import Province
from modules.territory.types.territory_types import LocationIn
from modules.user.types.user_types import Permission


SITE_CREATED_ACTION = "site.created"

SITE_UPDATED_ACTION = "site.updated"

SITE_DELETED_ACTION = "site.deleted"


class SiteService:
    def __init__(self, db: Session, current_user: CurrentUser) -> None:
        """
        Keep the session and the User reading or changing the mills.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
        """
        self.db = db
        self.current_user = current_user

    def list_sites(self) -> list[SiteOut]:
        """
        List the mills the caller holds (every one for the Owner), by code.

        Returns:
            list[SiteOut]: The Sites.
        """
        site_ids = resolve_site_ids(self.db, self.current_user, [])
        sites = self.db.scalars(select(Site).where(Site.id.in_(site_ids)).order_by(Site.code))
        return [map_site(site) for site in sites]

    def create_site(self, payload: SiteCreateIn) -> SiteOut:
        """
        Add a mill; only the Owner opens one.

        Args:
            payload (SiteCreateIn): Code, name, Location and phone.

        Returns:
            SiteOut: The new Site.

        Raises:
            RefusedError: sites_forbidden for anyone but the Owner, code_taken, province_not_found.
        """
        self._require_owner()
        if self.db.scalar(select(Site.id).where(Site.code == payload.code)):
            raise RefusedError("code_taken")
        self._check_province(payload.location)
        site = Site(code=payload.code, name=payload.name.strip(), phone=payload.phone, created_by_id=self.current_user.id, **build_location_columns(payload.location))
        self.db.add(site)
        self.db.flush()
        record_audit_event(self.db, self.current_user.id, SITE_CREATED_ACTION, entity_type="site", entity_id=site.id, after=map_site(site).model_dump(mode="json"))
        self.db.commit()
        return map_site(site)

    def update_site(self, site_id: UUID, payload: SiteUpdateIn) -> SiteOut:
        """
        Change a mill's name, Location or phone; its code never changes.

        Args:
            site_id (UUID): Site to change.
            payload (SiteUpdateIn): New name, Location and phone.

        Returns:
            SiteOut: The Site as saved.

        Raises:
            RefusedError: site_not_found, sites_forbidden without site.manage on it, province_not_found.
        """
        site = self._get_site(site_id)
        if not self.current_user.has_permission(site_id, Permission.SITE_MANAGE):
            raise RefusedError("sites_forbidden", 403)
        self._check_province(payload.location)
        before = map_site(site).model_dump(mode="json")
        site.name = payload.name.strip()
        site.phone = payload.phone
        for column, value in build_location_columns(payload.location).items():
            setattr(site, column, value)
        site.updated_by_id = self.current_user.id
        self.db.flush()
        record_audit_event(self.db, self.current_user.id, SITE_UPDATED_ACTION, entity_type="site", entity_id=site.id, before=before, after=map_site(site).model_dump(mode="json"))
        self.db.commit()
        return map_site(site)

    def delete_site(self, site_id: UUID) -> None:
        """
        Remove a mill that holds nothing yet, a typo for instance; one with any record stays.

        Args:
            site_id (UUID): Site to remove.

        Raises:
            RefusedError: sites_forbidden for anyone but the Owner, site_not_found, site_has_records.
        """
        self._require_owner()
        site = self._get_site(site_id)
        snapshot = map_site(site).model_dump(mode="json")
        try:
            with self.db.begin_nested():
                self.db.delete(site)
                self.db.flush()
        except IntegrityError as error:
            raise RefusedError("site_has_records") from error
        record_audit_event(self.db, self.current_user.id, SITE_DELETED_ACTION, entity_type="site", entity_id=site_id, before=snapshot)
        self.db.commit()

    def _require_owner(self) -> None:
        """
        Refuse anyone but the Owner.

        Raises:
            RefusedError: sites_forbidden.
        """
        if not self.current_user.is_owner:
            raise RefusedError("sites_forbidden", 403)

    def _get_site(self, site_id: UUID) -> Site:
        """
        Load a Site or refuse an unknown id.

        Args:
            site_id (UUID): Site id.

        Returns:
            Site: The Site.

        Raises:
            RefusedError: site_not_found.
        """
        site = self.db.get(Site, site_id)
        if site is None:
            raise RefusedError("site_not_found", 404)
        return site

    def _check_province(self, location: LocationIn) -> None:
        """
        Refuse a Location whose Province is unknown.

        Args:
            location (LocationIn): Location typed.

        Raises:
            RefusedError: province_not_found.
        """
        if self.db.get(Province, location.province) is None:
            raise RefusedError("province_not_found", 422)


def build_location_columns(location: LocationIn) -> dict[str, str]:
    """
    Spread a typed Location over the location columns, trimmed.

    Args:
        location (LocationIn): Location typed.

    Returns:
        dict[str, str]: province_id, city and address.
    """
    return {"province_id": location.province, "city": location.city.strip(), "address": location.address.strip()}


def map_site(site: Site) -> SiteOut:
    """
    Shape a Site for the front.

    Args:
        site (Site): Site row.

    Returns:
        SiteOut: The Site as the front reads it.
    """
    return SiteOut(id=site.id, code=site.code, name=site.name, province=site.province_id, city=site.city, address=site.address, phone=site.phone, status=site.status)


def get_site_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)) -> SiteService:
    """
    Build the site service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.

    Returns:
        SiteService: Service bound to the session and actor.
    """
    return SiteService(db, current_user)
