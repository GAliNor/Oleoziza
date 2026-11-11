from tests.model_helpers import get_registered_table, get_registered_table_names


def test_audit_table_is_registered_and_append_only() -> None:
    """
    The Audit Event table registers, with no updated_at since an entry is never edited.
    """
    audit_columns = set(get_registered_table("audit_events").c.keys())

    assert "audit_events" in get_registered_table_names()
    assert "updated_at" not in audit_columns
    assert {"before", "after", "reason"} <= audit_columns


def test_activity_feed_and_tasks_have_no_table() -> None:
    """
    The Activity Feed and the Home's to-do list are queries, never stored.
    """
    table_names = get_registered_table_names()

    assert "activity_feed" not in table_names
    assert "tasks" not in table_names
