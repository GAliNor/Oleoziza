from datetime import datetime


class StorageError(Exception):
    """
    The object storage (RustFS) refused or failed an operation.
    """


class AuthError(Exception):
    """
    A login, refresh or authenticated request was refused, carrying the code the front shows.
    """

    def __init__(self, code: str, status_code: int = 401, locked_until: datetime | None = None) -> None:
        """
        Keep the refusal code, its HTTP status and, for a locked account, when the lock ends.

        Args:
            code (str): Front-facing error code (invalid_credential, locked, session_expired...).
            status_code (int): HTTP status returned to the caller.
            locked_until (datetime | None): End of the lock, only for the locked code.
        """
        super().__init__(code)
        self.code = code
        self.status_code = status_code
        self.locked_until = locked_until


class SeedRefusedError(Exception):
    """
    Raised when a seed part cannot run in the current state: demo data in production, or demo before reference.
    """

    def __init__(self, code: str) -> None:
        """
        Keep the machine-readable reason the seed stopped.

        Args:
            code (str): Reason code, for example "production" or "reference_missing".
        """
        super().__init__(code)
        self.code = code


class RefusedError(Exception):
    """
    A write broke a business rule, carrying the code the front shows and the HTTP status it maps to.
    """

    def __init__(self, code: str, status_code: int = 409) -> None:
        """
        Keep the refusal code and its HTTP status.

        Args:
            code (str): Front-facing error code (for example tank_in_use, identifier_taken).
            status_code (int): HTTP status returned to the caller.
        """
        super().__init__(code)
        self.code = code
        self.status_code = status_code


class MessageDeliveryError(Exception):
    """
    An email or SMS could not be handed to its gateway; the Celery task retries.
    """
