from functools import lru_cache

from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher


secret_hasher = PasswordHash((Argon2Hasher(), BcryptHasher()))


def hash_secret(secret: str) -> str:
    """
    Hash a PIN or a password with Argon2 for storage in a Credential.

    Args:
        secret (str): Plain PIN or password.

    Returns:
        str: Argon2 hash with its parameters and salt.
    """
    return secret_hasher.hash(secret)


def is_secret_valid(secret: str, secret_hash: str) -> bool:
    """
    Check a plain PIN or password against a stored hash, without re-hashing it.

    Args:
        secret (str): Plain secret typed by the User.
        secret_hash (str): Stored hash.

    Returns:
        bool: True when the secret matches.
    """
    return secret_hasher.verify(secret, secret_hash)


@lru_cache
def get_dummy_secret_hash() -> str:
    """
    Build once a hash checked when the User has no such Credential, so a missing secret costs as much time as a wrong one.

    Returns:
        str: Argon2 hash of a throwaway secret.
    """
    return hash_secret("dummy-secret-for-missing-credentials")
