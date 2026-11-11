from tests.model_helpers import get_check_names, get_partial_unique_index_names, get_registered_table, get_registered_table_names, get_unique_column_sets


def test_finance_tables_are_registered() -> None:
    """
    The eight money tables register on the app's metadata.
    """
    expected_tables = {"discounts", "payments", "payment_allocations", "payment_proofs", "credit_notes", "credit_note_uses", "refunds", "debt_contacts"}

    assert expected_tables <= get_registered_table_names()


def test_a_lot_has_one_discount_in_force_and_a_refusal_needs_a_reason() -> None:
    """
    Refused Discounts stay as history, but only one other Discount can stand on a Lot.
    """
    assert "uq_discounts_single_in_force_per_lot" in get_partial_unique_index_names("discounts")
    assert "ck_discounts_refusal_has_reason" in get_check_names("discounts")


def test_milling_fee_and_payment_state_are_not_stored() -> None:
    """
    The Milling Fee and the Payment State are derived from the Lot, its Discount and its allocations.
    """
    lot_columns = set(get_registered_table("lots").c.keys())

    assert "milling_fee" not in lot_columns
    assert "payment_state" not in lot_columns


def test_payment_rules_hold_at_the_database() -> None:
    """
    An oil Payment carries its litres and price, a Payment pays each Lot once, and a proof belongs to one Payment or Refund.
    """
    assert "ck_payments_oil_payment_has_litres_and_price" in get_check_names("payments")
    assert {"payment_id", "lot_id"} in get_unique_column_sets("payment_allocations")
    assert "ck_payment_proofs_proves_one_payment_or_refund" in get_check_names("payment_proofs")


def test_refund_is_confirmed_by_someone_else_and_never_in_oil() -> None:
    """
    A Refund is never paid in oil, and the person who made it cannot confirm it.
    """
    check_names = get_check_names("refunds")

    assert "ck_refunds_confirmed_by_someone_else" in check_names
    assert "ck_refunds_method_is_not_oil" in check_names
