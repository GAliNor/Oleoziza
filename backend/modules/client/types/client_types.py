from enum import StrEnum


class ClientKind(StrEnum):
    """
    Whether a Client is a private person or a legal entity.
    """

    INDIVIDUAL = "individual"
    COMPANY = "company"


class ClientStatus(StrEnum):
    """
    Whether a Client is in use or was merged into another after an offline duplicate.
    """

    ACTIVE = "active"
    MERGED = "merged"
