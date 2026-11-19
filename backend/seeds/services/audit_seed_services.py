from uuid import UUID

from core.exceptions import SeedRefusedError
from modules.site.models.site_models import Site
from seeds.constants.audit_seed_constants import AUDIT_USERS, BERKANE_PRESS_LINES, BERKANE_TANKS, SITE_BERKANE
from seeds.constants.demo_seed_constants import SITE_OUJDA_ID
from seeds.services.demo_seed_services import PRODUCTION_ENVIRONMENT, DemoSeedService


class AuditSeedService(DemoSeedService):
    def run(self) -> dict[str, int]:
        """
        Add, on top of the demo data, a second mill (Berkane) with its Configuration and four Users scoped to known Sites, so security, performance and load tests can compare one Site's actor against another's.

        Returns:
            dict[str, int]: Count of each kind of row written.

        Raises:
            SeedRefusedError: production in production, demo_missing before the demo seed.
        """
        if self.settings.CURRENT_ENV == PRODUCTION_ENVIRONMENT:
            raise SeedRefusedError("production")
        if self.db.get(Site, UUID(SITE_OUJDA_ID)) is None:
            raise SeedRefusedError("demo_missing")
        self._seed_berkane()
        for user_seed in AUDIT_USERS:
            self._seed_user(user_seed)
        self.db.commit()
        return {"sites": 1, "tanks": len(BERKANE_TANKS), "press lines": len(BERKANE_PRESS_LINES), "users": len(AUDIT_USERS)}

    def _seed_berkane(self) -> None:
        """
        Write the Berkane mill and its Configuration for the open Season, with Tank and Press Line ids of its own.
        """
        site_id = UUID(SITE_BERKANE.id)
        self.db.merge(Site(id=site_id, code=SITE_BERKANE.code, name=SITE_BERKANE.name, province_id=SITE_BERKANE.province_id, city=SITE_BERKANE.city, address=SITE_BERKANE.address))
        self.db.flush()
        self._seed_configuration(site_id, BERKANE_TANKS, BERKANE_PRESS_LINES)
