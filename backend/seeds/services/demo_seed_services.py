from pathlib import Path
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from core.config import Settings
from core.exceptions import SeedRefusedError, StorageError
from core.integrations.rustfs.rustfs_client import RustFSClient
from core.helpers import get_local_midnight
from modules.auth.business.auth_secrets import hash_secret
from modules.auth.models.auth_models import Credential
from modules.auth.types.auth_types import CredentialKind
from modules.configuration.models.configuration_models import Box, PaymentMethodSetting, PressLine, SiteSetting, Tank
from modules.site.models.site_models import Season, Site
from modules.site.business.season_art import store_season_illustration
from modules.site.types.site_types import SeasonArtVariant, SeasonStatus
from modules.territory.models.territory_models import Province
from modules.user.models.user_models import SiteAssignment, SiteAssignmentPermission, User, UserLoginMethod
from seeds.constants.demo_seed_constants import (
    BOX_CAPACITY_IN_KG,
    BOX_COUNT,
    OWNER,
    PAST_PRICE_CHANGES,
    PAST_SEASON_CODE,
    PAST_SEASON_ENDS_ON,
    PAST_SEASON_ID,
    PAST_SEASON_LABEL,
    PAST_SEASON_STARTS_ON,
    PAYMENT_METHODS,
    PRESS_LINES,
    PRICES,
    SEASON_CODE,
    SEASON_ENDS_ON,
    SEASON_ID,
    SEASON_LABEL,
    SEASON_STARTS_ON,
    SITE_OUJDA_ID,
    SITES,
    TANKS,
)
from seeds.types.seed_types import UserSeed


PRODUCTION_ENVIRONMENT = "production"

SEASON_ART_DIRECTORY = Path(__file__).resolve().parent.parent / "fixtures" / "seasons"


class DemoSeedService:
    def __init__(self, db: Session, settings: Settings, storage: RustFSClient) -> None:
        """
        Keep the session, settings and storage the demo data is written with.

        Args:
            db (Session): Seed database session.
            settings (Settings): App settings, read for the environment.
            storage (RustFSClient): RustFS client, for the Season banners.
        """
        self.db = db
        self.settings = settings
        self.storage = storage

    def run(self) -> dict[str, int]:
        """
        Load or refresh the Oujda mill, the closed 2025-2026 and open 2026-2027 Seasons, Oujda's Configuration, and the Owner; every other User is created from the app.

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
        self._seed_configuration(UUID(SITE_OUJDA_ID))
        self._seed_user(OWNER)
        banner_count = self._seed_season_illustrations()
        self.db.commit()
        return {"season banners uploaded": banner_count, "sites": len(SITES), "seasons": 2, "boxes": BOX_COUNT, "tanks": len(TANKS), "press lines": len(PRESS_LINES), "users": 1}

    def _seed_sites_and_season(self) -> None:
        """
        Write the demo mill, the closed 2025-2026 Season and the open 2026-2027 one.
        """
        for site in SITES:
            self.db.merge(Site(id=UUID(site.id), code=site.code, name=site.name, province_id=site.province_id, city=site.city, address=site.address))
        closed_at = get_local_midnight(PAST_SEASON_ENDS_ON)
        self.db.merge(Season(id=UUID(PAST_SEASON_ID), code=PAST_SEASON_CODE, label=PAST_SEASON_LABEL, starts_on=PAST_SEASON_STARTS_ON, ends_on=PAST_SEASON_ENDS_ON, status=SeasonStatus.CLOSED, closed_at=closed_at))
        self.db.flush()
        self.db.merge(Season(id=UUID(SEASON_ID), code=SEASON_CODE, label=SEASON_LABEL, starts_on=SEASON_STARTS_ON, ends_on=SEASON_ENDS_ON, status=SeasonStatus.OPEN))
        self.db.flush()

    def _seed_configuration(self, site_id: UUID) -> None:
        """
        Write a Site's prices for the open Season, its Payment Methods, Boxes, Tanks and Press Lines, with the ids the front mocks use.

        Args:
            site_id (UUID): Site configured.
        """
        season_start = get_local_midnight(SEASON_STARTS_ON)
        for key, value, day in PAST_PRICE_CHANGES:
            self.db.merge(SiteSetting(id=build_seed_id("site-setting", site_id, f"{PAST_SEASON_CODE}:{key.value}:{day}"), site_id=site_id, season_id=UUID(PAST_SEASON_ID), key=key, value=value, effective_from=get_local_midnight(day)))
        for key, value in PRICES.items():
            self.db.merge(SiteSetting(id=build_seed_id("site-setting", site_id, key.value), site_id=site_id, season_id=UUID(SEASON_ID), key=key, value=value, effective_from=season_start))
        for method, (is_enabled, is_proof_required) in PAYMENT_METHODS.items():
            self.db.merge(PaymentMethodSetting(id=build_seed_id("payment-method", site_id, method.value), site_id=site_id, method=method, is_enabled=is_enabled, is_proof_required=is_proof_required, effective_from=season_start))
        for number in range(1, BOX_COUNT + 1):
            self.db.merge(Box(id=build_seed_id("box", site_id, str(number)), site_id=site_id, number=number, capacity_in_kg=BOX_CAPACITY_IN_KG, retired_at=None))
        for tank_id, number, capacity in TANKS:
            self.db.merge(Tank(id=UUID(tank_id), site_id=site_id, number=number, capacity_in_litres=capacity, retired_at=None))
        for line_id, number, name in PRESS_LINES:
            self.db.merge(PressLine(id=UUID(line_id), site_id=site_id, number=number, name=name, retired_at=None))
        self.db.flush()

    def _seed_season_illustrations(self) -> int:
        """
        Upload to RustFS the banners kept in seeds/fixtures/seasons (<code>.webp and <code>-dark.webp) for each Season that has none yet; skipped when RustFS is unreachable.

        Returns:
            int: Number of banners uploaded.
        """
        uploaded = 0
        for season in self.db.scalars(select(Season)):
            for variant, suffix, current in ((SeasonArtVariant.LIGHT, "", season.illustration_file_id), (SeasonArtVariant.DARK, "-dark", season.illustration_dark_file_id)):
                path = SEASON_ART_DIRECTORY / f"{season.code}{suffix}.webp"
                if current is not None or not path.exists():
                    continue
                try:
                    store_season_illustration(self.db, self.storage, season, variant, path.read_bytes(), "image/webp", "webp", path.name, None)
                except StorageError:
                    print(f"demo: RustFS unreachable, banner {path.name} skipped")
                    continue
                uploaded += 1
        return uploaded

    def _seed_user(self, user_seed: UserSeed) -> None:
        """
        Write one User and rebuild their Login Methods, Credentials and Site Assignments from scratch.

        Args:
            user_seed (UserSeed): User to write.
        """
        user_id = UUID(user_seed.id)
        self.db.merge(
            User(
                id=user_id,
                role=user_seed.role,
                is_owner=user_seed.is_owner,
                title=user_seed.title,
                first_name=user_seed.first_name,
                last_name=user_seed.last_name,
                phone=user_seed.phone,
                email=user_seed.email,
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
        Remove a User's Login Methods, Credentials and Site Assignments before writing them again.

        Args:
            user_id (UUID): User to clear.
        """
        assignment_ids = select(SiteAssignment.id).where(SiteAssignment.user_id == user_id)
        self.db.execute(delete(SiteAssignmentPermission).where(SiteAssignmentPermission.site_assignment_id.in_(assignment_ids)))
        self.db.execute(delete(SiteAssignment).where(SiteAssignment.user_id == user_id))
        self.db.execute(delete(UserLoginMethod).where(UserLoginMethod.user_id == user_id))
        self.db.execute(delete(Credential).where(Credential.user_id == user_id))


def build_seed_id(kind: str, site_id: UUID, key: str) -> UUID:
    """
    Derive a stable id for a seeded row, so re-running the seed updates it instead of adding a copy.

    Args:
        kind (str): Kind of row.
        site_id (UUID): Site it belongs to.
        key (str): What tells it apart within the Site.

    Returns:
        UUID: The same UUID on every run.
    """
    return uuid5(NAMESPACE_URL, f"oleoziza:{kind}:{site_id}:{key}")
