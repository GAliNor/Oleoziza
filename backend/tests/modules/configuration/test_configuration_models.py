from tests.model_helpers import get_check_names, get_registered_table, get_registered_table_names, get_unique_column_sets


def test_configuration_tables_are_registered() -> None:
    """
    The settings, equipment and variety tables register on the app's metadata.
    """
    assert {"site_settings", "payment_method_settings", "boxes", "tanks", "press_lines", "olive_varieties"} <= get_registered_table_names()


def test_prices_belong_to_a_season_except_the_daily_price() -> None:
    """
    A price version names its Season, unless it is the Daily Price, which stays dated only.
    """
    assert get_registered_table("site_settings").c.season_id.nullable is True
    assert "ck_site_settings_season_set_unless_daily_price" in get_check_names("site_settings")


def test_equipment_numbers_are_unique_per_site_and_retired_not_deleted() -> None:
    """
    Boxes, Tanks and Press Lines are numbered once per Site and leave service through retired_at.
    """
    for table_name in ("boxes", "tanks", "press_lines"):
        assert {"site_id", "number"} in get_unique_column_sets(table_name)
        assert get_registered_table(table_name).c.retired_at.nullable is True


def test_tank_stores_no_variety_or_fill() -> None:
    """
    A Tank's variety and fill are derived from its Storages, never stored on it.
    """
    tank_columns = set(get_registered_table("tanks").c.keys())

    assert "variety_id" not in tank_columns
    assert "fill_in_litres" not in tank_columns
