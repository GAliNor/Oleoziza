from tests.model_helpers import get_check_names, get_registered_table, get_registered_table_names


def test_oil_tables_are_registered() -> None:
    """
    The Storage, draw, Withdrawal and line tables register on the app's metadata.
    """
    assert {"storages", "storage_draws", "withdrawals", "withdrawal_lines"} <= get_registered_table_names()


def test_storage_keeps_no_remaining_litres() -> None:
    """
    What remains in a Storage is derived from its draws, never stored.
    """
    assert "remaining_in_litres" not in set(get_registered_table("storages").c.keys())


def test_each_draw_names_what_took_the_oil() -> None:
    """
    A draw for a Withdrawal names it, and so does a draw for an oil Payment.
    """
    check_names = get_check_names("storage_draws")

    assert "ck_storage_draws_withdrawal_draw_names_withdrawal" in check_names
    assert "ck_storage_draws_oil_payment_draw_names_payment" in check_names


def test_withdrawal_has_a_code_and_containers_are_rows() -> None:
    """
    A Withdrawal gets its readable code at sync, and its containers are lines rather than a list.
    """
    assert get_registered_table("withdrawals").c.code.unique is True
    assert "containers" not in set(get_registered_table("withdrawals").c.keys())
    assert "ck_withdrawal_lines_container_count_is_positive" in get_check_names("withdrawal_lines")
