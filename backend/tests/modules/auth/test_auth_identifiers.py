import pytest

from modules.auth.helpers.auth_identifiers import normalize_identifier


@pytest.mark.parametrize(
    ("raw_identifier", "expected"),
    [
        ("0661100001", "+212661100001"),
        ("06 61 10 00 01", "+212661100001"),
        ("00212661100001", "+212661100001"),
        ("+212 5 36 61 02 00", "+212536610200"),
        ("  M.Taibi@Oleoziza.ma ", "m.taibi@oleoziza.ma"),
        ("0461100001", None),
        ("not-an-email@", None),
    ],
)
def test_identifiers_normalize_like_the_front(raw_identifier: str, expected: str | None) -> None:
    """
    Phones become E.164 Moroccan numbers and emails lowercase, the same way the front normalizes them.

    Args:
        raw_identifier (str): Identifier as typed.
        expected (str | None): Normalized form, or None when refused.
    """
    assert normalize_identifier(raw_identifier) == expected
