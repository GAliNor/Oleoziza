from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import get_db
from modules.territory.models.territory_models import City, Province
from modules.territory.types.territory_types import ProvinceOut


class TerritoryService:
    def __init__(self, db: Session) -> None:
        """
        Keep the session the reference data is read with.

        Args:
            db (Session): Request-scoped database session.
        """
        self.db = db

    def list_provinces(self) -> list[ProvinceOut]:
        """
        List the Provinces of the Oriental in the owner's order, each with its outline and its main towns, in two queries.

        Returns:
            list[ProvinceOut]: Every Province with its towns.
        """
        provinces = self.db.scalars(select(Province).order_by(Province.position, Province.name)).all()
        cities_by_province: dict[str, list[str]] = {}
        for city in self.db.scalars(select(City).order_by(City.province_id, City.position, City.name)):
            cities_by_province.setdefault(city.province_id, []).append(city.name)
        return [
            ProvinceOut(
                id=province.id,
                name=province.name,
                kind=province.kind,
                label_at=(float(province.longitude), float(province.latitude)) if province.longitude is not None and province.latitude is not None else None,
                boundary=province.boundary,
                cities=cities_by_province.get(province.id, []),
            )
            for province in provinces
        ]


def get_territory_service(db: Session = Depends(get_db)) -> TerritoryService:
    """
    Build the territory service for one request.

    Args:
        db (Session): Request-scoped database session.

    Returns:
        TerritoryService: Service bound to the session.
    """
    return TerritoryService(db)
