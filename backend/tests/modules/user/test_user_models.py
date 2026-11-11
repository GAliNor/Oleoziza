from sqlalchemy import CheckConstraint, UniqueConstraint

from core.app_init import init_models
from core.database import Base
from modules.user.types.user_types import Permission


def get_unique_column_sets(table_name: str) -> list[set[str]]:
    """
    List the column sets of a table's multi-column unique constraints.

    Args:
        table_name (str): Name of the registered table.

    Returns:
        list[set[str]]: One set of column names per unique constraint.
    """
    table = Base.metadata.tables[table_name]
    return [{column.name for column in constraint.columns} for constraint in table.constraints if isinstance(constraint, UniqueConstraint)]


def test_user_tables_are_registered() -> None:
    """
    The four people-and-access tables register on the app's metadata.
    """
    init_models()

    assert {"users", "user_login_methods", "site_assignments", "site_assignment_permissions"} <= set(Base.metadata.tables)


def test_user_needs_a_phone_or_an_email_and_both_are_unique() -> None:
    """
    A User is reachable by phone or email, and no two Users share either.
    """
    init_models()
    users = Base.metadata.tables["users"]
    check_names = {constraint.name for constraint in users.constraints if isinstance(constraint, CheckConstraint)}

    assert "ck_users_has_phone_or_email" in check_names
    assert users.c.phone.unique is True
    assert users.c.email.unique is True


def test_login_methods_and_permissions_are_rows_not_lists() -> None:
    """
    Each Login Method and each Permission is one row, unique per User or per assignment.
    """
    init_models()

    assert {"user_id", "method"} in get_unique_column_sets("user_login_methods")
    assert {"user_id", "site_id"} in get_unique_column_sets("site_assignments")
    assert {"site_assignment_id", "permission"} in get_unique_column_sets("site_assignment_permissions")


def test_permission_catalogue_holds_the_front_keys_and_set_price() -> None:
    """
    The catalogue carries the 31 front Permissions plus lot.set_price.
    """
    assert len(Permission) == 32
    assert Permission.LOT_SET_PRICE == "lot.set_price"
