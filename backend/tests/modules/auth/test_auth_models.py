from tests.model_helpers import get_registered_table, get_registered_table_names, get_unique_column_sets


def test_auth_tables_are_registered_without_a_session_table() -> None:
    """
    The credential, code and invitation tables register; there is no session table, since auth is stateless.
    """
    table_names = get_registered_table_names()

    assert {"credentials", "one_time_codes", "invitations"} <= table_names
    assert "user_sessions" not in table_names


def test_a_user_has_at_most_one_credential_of_each_kind() -> None:
    """
    A User keeps one PIN and one password at most.
    """
    assert {"user_id", "kind"} in get_unique_column_sets("credentials")


def test_invitation_token_is_unique() -> None:
    """
    An invitation token points at exactly one row.
    """
    assert get_registered_table("invitations").c.token_hash.unique is True


def test_user_carries_a_token_version() -> None:
    """
    Bumping a User's token version revokes every refresh token issued before.
    """
    assert get_registered_table("users").c.token_version.nullable is False
