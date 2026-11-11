from datetime import datetime, timezone
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from core.config import Settings
from core.exceptions import SeedRefusedError
from modules.auth.business.auth_secrets import hash_secret
from modules.auth.models.auth_models import Credential
from modules.auth.types.auth_types import CredentialKind
from modules.client.models.client_models import Client, ClientContact
from modules.site.models.site_models import Season, Site
from modules.territory.models.territory_models import Province
from modules.user.models.user_models import SiteAssignment, SiteAssignmentPermission, User, UserLoginMethod
from seeds.constants.demo_seed_constants import CLIENTS, COMPANY_CONTACT_JOB_TITLE, SEASON_CODE, SEASON_ID, SEASON_LABEL, SEASON_STARTS_ON, SITES, USERS
from seeds.types.seed_types import UserSeed


PRODUCTION_ENVIRONMENT = "production"


class DemoSeedService:
    def __init__(self, db: Session, settings: Settings) -> None:
        """
        Keep the session and settings the demo data is written with.

        Args:
            db (Session): Seed database session.
            settings (Settings): App settings, read for the environment.
        """
        self.db = db
        self.settings = settings

    def run(self) -> dict[str, int]:
        """
        Load or refresh the demo Sites, Season, Clients and Users, with the ids, secrets and Permissions the front mocks use.

        Returns:
            dict[str, int]: Count of each kind of row written.

        Raises:
            SeedRefusedError: production in production, reference_missing before the reference seed.
        """
        if self.settings.CURRENT_ENV == PRODUCTION_ENVIRONMENT:
            raise SeedRefusedError("production")
        if self.db.scalar(select(Province.id).limit(1)) is None:
            raise SeedRefusedError("reference_missing")
        self._seed_sites_and_season()
        self._seed_clients()
        for user_seed in USERS:
            self._seed_user(user_seed)
        self.db.commit()
        return {"sites": len(SITES), "seasons": 1, "clients": len(CLIENTS), "users": len(USERS)}

    def _seed_sites_and_season(self) -> None:
        """
        Write the two demo mills and the open 2026-2027 Season.
        """
        for site in SITES:
            self.db.merge(Site(id=UUID(site.id), code=site.code, name=site.name, province_id=site.province_id, city=site.city, address=site.address))
        self.db.merge(Season(id=UUID(SEASON_ID), code=SEASON_CODE, label=SEASON_LABEL, starts_on=SEASON_STARTS_ON))
        self.db.flush()

    def _seed_clients(self) -> None:
        """
        Write the three Clients the demo client Users speak for, and the Company's contact person.
        """
        now = datetime.now(timezone.utc)
        for client in CLIENTS:
            self.db.merge(
                Client(
                    id=UUID(client.id),
                    kind=client.kind,
                    title=client.title,
                    first_name=client.first_name,
                    last_name=client.last_name,
                    legal_name=client.legal_name,
                    phone=client.phone,
                    province_id=client.province_id,
                    city=client.city,
                    address=client.address,
                    first_site_id=UUID(client.first_site_id),
                    entered_at=now,
                )
            )
        self.db.flush()
        for user_seed in USERS:
            if user_seed.is_client_contact and user_seed.client_id:
                self.db.merge(
                    ClientContact(
                        id=build_contact_id(user_seed.id),
                        client_id=UUID(user_seed.client_id),
                        title=user_seed.title,
                        first_name=user_seed.first_name,
                        last_name=user_seed.last_name,
                        job_title=COMPANY_CONTACT_JOB_TITLE,
                        phone=user_seed.phone,
                        email=user_seed.email,
                        is_primary=True,
                    )
                )
        self.db.flush()

    def _seed_user(self, user_seed: UserSeed) -> None:
        """
        Write one demo User and rebuild their Login Methods, Credentials and Site Assignments from scratch.

        Args:
            user_seed (UserSeed): Demo User to write.
        """
        user_id = UUID(user_seed.id)
        self.db.merge(
            User(
                id=user_id,
                role=user_seed.role,
                is_owner=user_seed.is_owner,
                client_id=UUID(user_seed.client_id) if user_seed.client_id else None,
                client_contact_id=build_contact_id(user_seed.id) if user_seed.is_client_contact else None,
                title=user_seed.title,
                first_name=user_seed.first_name,
                last_name=user_seed.last_name,
                phone=user_seed.phone,
                email=user_seed.email,
                province_id=user_seed.province_id,
                city=user_seed.city,
                address=user_seed.address,
                status=user_seed.status,
                must_change_credential=user_seed.must_change_credential,
                failed_login_attempts=0,
                locked_until=None,
            )
        )
        self.db.flush()
        self._clear_user_children(user_id)
        for method in user_seed.login_methods:
            self.db.add(UserLoginMethod(user_id=user_id, method=method))
        for kind, secret in ((CredentialKind.PIN, user_seed.pin), (CredentialKind.PASSWORD, user_seed.password)):
            if secret is not None:
                self.db.add(Credential(user_id=user_id, kind=kind, hash=hash_secret(secret)))
        for site_id, permissions in user_seed.permissions_by_site.items():
            assignment = SiteAssignment(user_id=user_id, site_id=UUID(site_id))
            self.db.add(assignment)
            self.db.flush()
            for permission in dict.fromkeys(permissions):
                self.db.add(SiteAssignmentPermission(site_assignment_id=assignment.id, permission=permission))

    def _clear_user_children(self, user_id: UUID) -> None:
        """
        Remove a demo User's Login Methods, Credentials and Site Assignments before writing them again.

        Args:
            user_id (UUID): Demo User to clear.
        """
        assignment_ids = select(SiteAssignment.id).where(SiteAssignment.user_id == user_id)
        self.db.execute(delete(SiteAssignmentPermission).where(SiteAssignmentPermission.site_assignment_id.in_(assignment_ids)))
        self.db.execute(delete(SiteAssignment).where(SiteAssignment.user_id == user_id))
        self.db.execute(delete(UserLoginMethod).where(UserLoginMethod.user_id == user_id))
        self.db.execute(delete(Credential).where(Credential.user_id == user_id))


def build_contact_id(user_id: str) -> UUID:
    """
    Derive a stable Client Contact id from the demo User who speaks for the Company.

    Args:
        user_id (str): Demo User id.

    Returns:
        UUID: The same UUID on every run.
    """
    return uuid5(NAMESPACE_URL, f"oleoziza:client-contact:{user_id}")
