from decimal import Decimal
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy.orm import Session

from modules.configuration.models.configuration_models import OliveVariety
from modules.territory.models.territory_models import City, Province
from modules.territory.types.territory_types import ProvinceKind
from seeds.constants.reference_seed_constants import OLIVE_VARIETIES, PROVINCES


class ReferenceSeedService:
    def __init__(self, db: Session) -> None:
        """
        Keep the session the reference data is written with.

        Args:
            db (Session): Seed database session.
        """
        self.db = db

    def run(self) -> None:
        """
        Load or refresh the eight Provinces of the Oriental with their towns, and the olive varieties.
        """
        for province in PROVINCES:
            kind = ProvinceKind.PREFECTURE if province.is_prefecture else ProvinceKind.PROVINCE
            self.db.merge(Province(id=province.id, name=province.name, kind=kind, latitude=Decimal(province.latitude), longitude=Decimal(province.longitude)))
        self.db.flush()
        for province in PROVINCES:
            for city_name in province.cities:
                self.db.merge(City(id=build_city_id(province.id, city_name), province_id=province.id, name=city_name))
        for variety_id, variety_name in OLIVE_VARIETIES:
            self.db.merge(OliveVariety(id=variety_id, name=variety_name, is_active=True))
        self.db.commit()


def build_city_id(province_id: str, city_name: str) -> UUID:
    """
    Derive a stable id for a town, so re-running the seed updates it instead of adding a copy.

    Args:
        province_id (str): Province slug.
        city_name (str): Town name.

    Returns:
        UUID: The same UUID for the same town on every run.
    """
    return uuid5(NAMESPACE_URL, f"oleoziza:city:{province_id}:{city_name}")
