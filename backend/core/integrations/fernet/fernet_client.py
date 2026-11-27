from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from core.config import get_settings
from core.exceptions import SecretBoxError


class SecretBox:
    def __init__(self, master_key: str) -> None:
        """
        Seal and open secrets stored in the database (AI provider keys) with the master key from the environment.

        Args:
            master_key (str): Fernet key from AI_SECRETS_KEY; empty when the environment does not set one.
        """
        self._fernet = Fernet(master_key.encode()) if master_key else None

    def seal(self, secret: str) -> str:
        """
        Encrypt a secret for storage.

        Args:
            secret (str): Plain secret.

        Returns:
            str: Encrypted token, safe to store.

        Raises:
            SecretBoxError: ai_secrets_key_missing when no master key is configured.
        """
        return self._get_fernet().encrypt(secret.encode()).decode()

    def open(self, token: str) -> str:
        """
        Decrypt a stored secret.

        Args:
            token (str): Encrypted token.

        Returns:
            str: Plain secret.

        Raises:
            SecretBoxError: ai_secrets_key_missing without a master key, ai_secret_unreadable when the key does not match.
        """
        try:
            return self._get_fernet().decrypt(token.encode()).decode()
        except InvalidToken as error:
            raise SecretBoxError("ai_secret_unreadable") from error

    def reseal(self, token: str, old_master_key: str) -> str:
        """
        Re-encrypt a token sealed with a previous master key under the current one, for a key rotation.

        Args:
            token (str): Token sealed with the old master key.
            old_master_key (str): The previous AI_SECRETS_KEY.

        Returns:
            str: The same secret sealed with the current master key.

        Raises:
            SecretBoxError: ai_secret_unreadable when the old key does not open the token.
        """
        try:
            secret = Fernet(old_master_key.encode()).decrypt(token.encode()).decode()
        except InvalidToken as error:
            raise SecretBoxError("ai_secret_unreadable") from error
        return self.seal(secret)

    def _get_fernet(self) -> Fernet:
        """
        Return the configured cipher.

        Returns:
            Fernet: Cipher built from the master key.

        Raises:
            SecretBoxError: ai_secrets_key_missing when no master key is configured.
        """
        if self._fernet is None:
            raise SecretBoxError("ai_secrets_key_missing")
        return self._fernet


@lru_cache
def get_secret_box() -> SecretBox:
    """
    Build the secret box once from the settings.

    Returns:
        SecretBox: Cached secret box.
    """
    return SecretBox(get_settings().AI_SECRETS_KEY)
