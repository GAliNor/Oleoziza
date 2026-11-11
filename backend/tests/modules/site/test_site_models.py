from tests.model_helpers import get_partial_unique_index_names, get_registered_table, get_registered_table_names, get_unique_column_sets


def test_site_tables_are_registered() -> None:
    """
    The Site, Season and code sequence tables register on the app's metadata.
    """
    assert {"sites", "seasons", "code_sequences"} <= get_registered_table_names()


def test_site_has_a_unique_code_and_a_required_location() -> None:
    """
    A Site's two-letter code is unique, and its place in the Oriental is required while its map position is optional.
    """
    sites = get_registered_table("sites")

    assert sites.c.code.unique is True
    assert sites.c.province_id.nullable is False
    assert sites.c.address.nullable is False
    assert sites.c.latitude.nullable is True


def test_only_one_season_can_be_open() -> None:
    """
    A partial unique index allows a single open Season at a time.
    """
    assert "uq_seasons_single_open" in get_partial_unique_index_names("seasons")


def test_codes_count_per_site_season_and_kind() -> None:
    """
    Each kind of record has its own sequence on each Site in each Season.
    """
    assert {"site_id", "season_id", "kind"} in get_unique_column_sets("code_sequences")
