from tests.model_helpers import get_registered_table, get_registered_table_names, get_unique_column_sets


def test_territory_tables_are_registered() -> None:
    """
    The Province and City tables register on the app's metadata.
    """
    assert {"provinces", "cities"} <= get_registered_table_names()


def test_province_is_keyed_by_slug_with_optional_position() -> None:
    """
    A Province is keyed by its slug and may carry a map position.
    """
    provinces = get_registered_table("provinces")

    assert str(provinces.c.id.type) == "VARCHAR(64)"
    assert provinces.c.latitude.nullable is True
    assert provinces.c.longitude.nullable is True


def test_city_name_is_unique_within_its_province() -> None:
    """
    The same city name cannot appear twice in one Province.
    """
    assert {"province_id", "name"} in get_unique_column_sets("cities")
