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

    def __init__(self, code: str, status_code: int = 409, details: dict[str, object] | None = None) -> None:
        """
        Keep the refusal code, its HTTP status and the details the front shows beside it.

        Args:
            code (str): Front-facing error code (for example tank_in_use, identifier_taken).
            status_code (int): HTTP status returned to the caller.
            details (dict[str, object] | None): Counts or amounts the front shows next to the message.
        """
        super().__init__(code)
        self.code = code
        self.status_code = status_code
        self.details = details or {}


class MessageDeliveryError(Exception):
    """
    An email or SMS could not be handed to its gateway; the Celery task retries.
    """


class SecretBoxError(Exception):
    """
    A secret could not be sealed or opened: the master key is missing or wrong, or the stored value was tampered with.
    """

    def __init__(self, code: str) -> None:
        """
        Keep the refusal code.

        Args:
            code (str): ai_secrets_key_missing or ai_secret_unreadable.
        """
        super().__init__(code)
        self.code = code


class AiProviderError(Exception):
    """
    An AI provider refused or failed a call: unreachable, timed out, wrong key, unknown model, or an answer that is not the JSON asked for.
    """

    def __init__(self, code: str, detail: str = "") -> None:
        """
        Keep the refusal code and the provider's own message.

        Args:
            code (str): ai_provider_unreachable, ai_provider_timeout, ai_provider_rejected_key, ai_provider_refused or ai_provider_bad_answer.
            detail (str): The provider's message, kept for the ledger.
        """
        super().__init__(code)
        self.code = code
        self.detail = detail
