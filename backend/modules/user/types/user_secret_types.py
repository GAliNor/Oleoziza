from pydantic import Field

from core.types import CamelModel
from modules.auth.types.auth_types import CredentialKind


class SecretIn(CamelModel):
    """
    The PIN or password an Owner sets for a staff User, to change at next login.
    """

    kind: CredentialKind
    secret: str = Field(max_length=200)
