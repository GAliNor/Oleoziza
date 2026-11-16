from tests.model_helpers import get_check_names, get_registered_table, get_registered_table_names


def test_expense_tables_are_registered() -> None:
    """
    The four Expense tables register on the app's metadata.
    """
    assert {"expenses", "suppliers", "expense_categories", "expense_documents"} <= get_registered_table_names()


def test_expense_rules_hold_at_the_database() -> None:
    """
    An Expense is positive, its TVA rate is one of 2026's, and a cancellation keeps its reason and time.
    """
    checks = get_check_names("expenses")

    assert {"ck_expenses_amount_is_positive", "ck_expenses_vat_rate_is_known", "ck_expenses_cancellation_has_reason"} <= checks


def test_only_a_subcategory_has_a_parent() -> None:
    """
    The two-level tree is held by one check: a category has no parent, a sub-category always has one.
    """
    assert "ck_expense_categories_category_has_no_parent" in get_check_names("expense_categories")


def test_derived_amounts_are_not_stored() -> None:
    """
    HT and TVA are derived from the TTC amount and the rate, never stored.
    """
    columns = set(get_registered_table("expenses").c.keys())

    assert not {"amount_excl_vat", "vat_amount"} & columns
