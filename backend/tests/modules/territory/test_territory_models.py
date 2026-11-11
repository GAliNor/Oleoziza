from sqlalchemy import UniqueConstraint

from core.app_init import init_models
from core.database import Base


def test_territory_tables_are_registered() -> None:
    """
    The Province and City tables register on the app's metadata.
    """
    init_models()

    assert {"provinces", "cities"} <= set(Base.metadata.tables)


def test_province_is_keyed_by_slug_with_optional_position() -> None:
    """
    A Province is keyed by its slug and may carry a map position.
    """
    init_models()
    provinces = Base.metadata.tables["provinces"]

    assert str(provinces.c.id.type) == "VARCHAR(64)"
    assert provinces.c.latitude.nullable is True
    assert provinces.c.longitude.nullable is True


def test_city_name_is_unique_within_its_province() -> None:
    """
    The same city name cannot appear twice in one Province.
    """
    init_models()
    cities = Base.metadata.tables["cities"]
    unique_column_sets = [{column.name for column in constraint.columns} for constraint in cities.constraints if isinstance(constraint, UniqueConstraint)]

    assert {"province_id", "name"} in unique_column_sets
