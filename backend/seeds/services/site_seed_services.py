from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.exceptions import SeedRefusedError
from modules.site.models.site_models import Site
from modules.territory.models.territory_models import Province
from seeds.constants.demo_seed_constants import SITES


class SiteSeedService:
    def __init__(self, db: Session) -> None:
        """
        Keep the session the first Site is written with.

        Args:
            db (Session): Seed database session.
        """
        self.db = db

    def run(self) -> bool:
        """
        Create the Oujda mill as the first Site, the same one the demo seed uses, unless a Site already exists; its prices and equipment are set afterwards on the Configuration page.

        Returns:
            bool: True when the Site was created, False when a Site already existed.

        Raises:
            SeedRefusedError: reference_missing before the reference seed.
        """
        if self.db.scalar(select(Site.id).limit(1)) is not None:
            return False
        if self.db.scalar(select(Province.id).limit(1)) is None:
            raise SeedRefusedError("reference_missing")
        for site in SITES:
            self.db.add(Site(id=UUID(site.id), code=site.code, name=site.name, province_id=site.province_id, city=site.city, address=site.address))
        self.db.commit()
        return True
