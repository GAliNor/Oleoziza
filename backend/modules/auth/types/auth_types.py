from enum import StrEnum


class CredentialKind(StrEnum):
    """
    The secret a User logs in with.
    """

    PIN = "pin"
    PASSWORD = "password"


class OneTimeCodePurpose(StrEnum):
    """
    What a one-time SMS code or email link is for.
    """

    LOGIN = "login"
    RESET = "reset"


class MessageChannel(StrEnum):
    """
    How a message reaches a person.
    """

    SMS = "sms"
    EMAIL = "email"
