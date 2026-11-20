from sqlalchemy import select
from sqlalchemy.orm import Session

from core.config import Settings
from core.exceptions import SeedRefusedError
from modules.auth.business.auth_secrets import hash_secret
from modules.auth.models.auth_models import Credential
from modules.auth.types.auth_types import CredentialKind
from modules.user.models.user_models import User, UserLoginMethod
from modules.user.types.user_types import LoginMethod, Role, UserStatus


class OwnerSeedService:
    def __init__(self, db: Session, settings: Settings) -> None:
        """
        Keep the session and the SEED_OWNER_* settings the first Owner is created from.

        Args:
            db (Session): Seed database session.
            settings (Settings): App settings.
        """
        self.db = db
        self.settings = settings

    def run(self) -> bool:
        """
        Create the first Owner, who logs in by email and password and must replace that seeded password at first login; once an Owner exists, nothing is read or written, so the SEED_OWNER_* settings may then be emptied.

        Returns:
            bool: True when the Owner was created, False when an Owner, or a User with that email, already existed.

        Raises:
            SeedRefusedError: owner_settings_missing when no Owner exists yet and an SEED_OWNER_* setting is empty.
        """
        if self.db.scalar(select(User.id).where(User.is_owner.is_(True)).limit(1)) is not None:
            return False
        settings = self.settings
        if not all((settings.SEED_OWNER_EMAIL, settings.SEED_OWNER_PASSWORD, settings.SEED_OWNER_FIRST_NAME, settings.SEED_OWNER_LAST_NAME)):
            raise SeedRefusedError("owner_settings_missing")
        email = settings.SEED_OWNER_EMAIL.strip().lower()
        if self.db.scalar(select(User.id).where(User.email == email)) is not None:
            return False
        owner = User(
            role=Role.MANAGEMENT,
            is_owner=True,
            first_name=settings.SEED_OWNER_FIRST_NAME,
            last_name=settings.SEED_OWNER_LAST_NAME,
            email=email,
            status=UserStatus.ACTIVE,
            must_change_credential=True,
        )
        self.db.add(owner)
        self.db.flush()
        self.db.add(UserLoginMethod(user_id=owner.id, method=LoginMethod.EMAIL_PASSWORD))
        self.db.add(Credential(user_id=owner.id, kind=CredentialKind.PASSWORD, hash=hash_secret(settings.SEED_OWNER_PASSWORD)))
        self.db.commit()
        return True
