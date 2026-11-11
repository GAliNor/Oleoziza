from tests.model_helpers import get_check_names, get_partial_unique_index_names, get_registered_table, get_registered_table_names


def test_lot_tables_are_registered_and_pressing_has_no_table() -> None:
    """
    The Lot tables register, and the Pressing lives on the Lot rather than in a table of its own.
    """
    table_names = get_registered_table_names()

    assert {"lots", "box_occupancies", "pressing_pauses", "lot_photos", "notifications"} <= table_names
    assert "pressings" not in table_names


def test_lot_carries_its_pressing() -> None:
    """
    The Lot holds the Pressing's start, end and oil, filled once pressing happens.
    """
    lots = get_registered_table("lots")

    for column_name in ("pressing_started_at", "pressing_started_by_id", "pressing_ended_at", "pressing_ended_by_id", "oil_in_litres"):
        assert lots.c[column_name].nullable is True


def test_lot_keeps_suggested_and_applied_prices() -> None:
    """
    A Service Milling Lot keeps the suggested rate from Configuration and the rate actually applied.
    """
    lots = get_registered_table("lots")

    assert {"suggested_milling_rate_per_kg", "milling_rate_per_kg", "suggested_daily_price_per_kg", "daily_price_per_kg"} <= set(lots.c.keys())
    assert "ck_lots_service_milling_has_rates" in get_check_names("lots")


def test_lot_has_a_code_and_an_offline_trace() -> None:
    """
    A Lot gets its readable code at sync and keeps when and how it was typed.
    """
    lots = get_registered_table("lots")

    assert lots.c.code.unique is True
    assert lots.c.code.nullable is True
    assert lots.c.entered_at.nullable is False


def test_a_box_holds_one_lot_at_a_time() -> None:
    """
    A partial unique index allows one open occupancy per Box.
    """
    assert "uq_box_occupancies_single_open_per_box" in get_partial_unique_index_names("box_occupancies")
