from tests.model_helpers import get_registered_table, get_registered_table_names, get_unique_column_sets


def test_auth_tables_are_registered() -> None:
    """
    The credential, code, invitation and session tables register on the app's metadata.
    """
    assert {"credentials", "one_time_codes", "invitations", "user_sessions"} <= get_registered_table_names()


def test_a_user_has_at_most_one_credential_of_each_kind() -> None:
    """
    A User keeps one PIN and one password at most.
    """
    assert {"user_id", "kind"} in get_unique_column_sets("credentials")


def test_tokens_are_unique() -> None:
    """
    An invitation token or a refresh token points at exactly one row.
    """
    assert get_registered_table("invitations").c.token_hash.unique is True
    assert get_registered_table("user_sessions").c.refresh_token_hash.unique is True
