import re


EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

MOROCCAN_PHONE_PATTERN = re.compile(r"^(?:(?:\+|00)212|0)?([5-7]\d{8})$")

PHONE_SEPARATORS_PATTERN = re.compile(r"[\s.\-()]")


def is_email(identifier: str) -> bool:
    """
    Tell whether a login identifier is an email rather than a phone, the way the front does.

    Args:
        identifier (str): Identifier typed at login.

    Returns:
        bool: True when it contains an @.
    """
    return "@" in identifier


def normalize_identifier(raw_identifier: str) -> str | None:
    """
    Turn a typed identifier into the stored form: a lowercase email, or a Moroccan phone in E.164 (06… → +2126…).

    Args:
        raw_identifier (str): Identifier as typed.

    Returns:
        str | None: Normalized identifier, or None when it is neither a valid email nor a Moroccan phone.
    """
    value = raw_identifier.strip()
    if is_email(value):
        return value.lower() if EMAIL_PATTERN.match(value) else None
    match = MOROCCAN_PHONE_PATTERN.match(PHONE_SEPARATORS_PATTERN.sub("", value))
    return f"+212{match.group(1)}" if match else None
