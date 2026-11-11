from modules.user.types.user_types import Permission
from tests.model_helpers import get_check_names, get_registered_table, get_registered_table_names, get_unique_column_sets


def test_user_tables_are_registered() -> None:
    """
    The four people-and-access tables register on the app's metadata.
    """
    assert {"users", "user_login_methods", "site_assignments", "site_assignment_permissions"} <= get_registered_table_names()


def test_user_needs_a_phone_or_an_email_and_both_are_unique() -> None:
    """
    A User is reachable by phone or email, and no two Users share either.
    """
    users = get_registered_table("users")

    assert "ck_users_has_phone_or_email" in get_check_names("users")
    assert users.c.phone.unique is True
    assert users.c.email.unique is True


def test_login_methods_and_permissions_are_rows_not_lists() -> None:
    """
    Each Login Method and each Permission is one row, unique per User or per assignment.
    """
    assert {"user_id", "method"} in get_unique_column_sets("user_login_methods")
    assert {"user_id", "site_id"} in get_unique_column_sets("site_assignments")
    assert {"site_assignment_id", "permission"} in get_unique_column_sets("site_assignment_permissions")


def test_permission_catalogue_holds_the_front_keys_and_set_price() -> None:
    """
    The catalogue carries the 31 front Permissions plus lot.set_price.
    """
    assert len(Permission) == 32
    assert Permission.LOT_SET_PRICE == "lot.set_price"
