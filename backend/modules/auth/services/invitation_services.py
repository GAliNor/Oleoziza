import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.config import get_settings
from core.database import get_db
from core.exceptions import AuthError
from core.integrations.mail.mail_client import get_mail_client
from core.integrations.sms.sms_client import get_sms_client
from modules.auth.business.auth_secrets import hash_secret
from modules.auth.models.auth_models import Credential, Invitation
from modules.auth.services.auth_services import AuthService
from modules.auth.types.auth_types import CredentialKind, InvitationOut, IssuedLogin, MessageChannel
from modules.user.models.user_models import User, UserLoginMethod
from modules.user.types.user_types import LoginMethod, UserStatus


INVALID_INVITATION_CODE = "invalid_invitation"

INVITATION_TOKEN_BYTES = 32

INVITATION_EMAIL_SUBJECT = "Votre accès à Olivor"


class InvitationService:
    def __init__(self, db: Session) -> None:
        """
        Keep the session used to create, send and accept Invitations.

        Args:
            db (Session): Database session.
        """
        self.db = db
        self.settings = get_settings()

    def create_invitation(self, user: User, inviter_id: UUID) -> tuple[Invitation, str]:
        """
        Add an Invitation letting a User set their own secret, by email when they have one, otherwise by SMS; only its hash is stored.

        Args:
            user (User): User invited, or asked to set a new secret.
            inviter_id (UUID): Management User sending it.

        Returns:
            tuple[Invitation, str]: The Invitation, added but not committed, and its plain token for the link.
        """
        token = secrets.token_urlsafe(INVITATION_TOKEN_BYTES)
        channel = MessageChannel.EMAIL if user.email else MessageChannel.SMS
        invitation = Invitation(
            user_id=user.id,
            channel=channel,
            sent_to=user.email if channel == MessageChannel.EMAIL else user.phone,
            token_hash=hash_token(token),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=self.settings.AUTH_INVITATION_EXPIRY_IN_SECONDS),
            created_by_id=inviter_id,
        )
        self.db.add(invitation)
        self.db.flush()
        return invitation, token

    def send_invitation(self, invitation_id: UUID, token: str) -> None:
        """
        Send an Invitation's link by email or SMS.

        Args:
            invitation_id (UUID): Invitation to send.
            token (str): Its plain token, which only the message carries.

        Raises:
            MessageDeliveryError: If the email could not be handed to the SMTP server.
        """
        invitation = self.db.get(Invitation, invitation_id)
        if invitation is None or invitation.accepted_at is not None:
            return
        user = self.db.get(User, invitation.user_id)
        link = f"{self.settings.FRONT_BASE_URL}/invitation/{token}"
        if invitation.channel == MessageChannel.EMAIL:
            body = f"Bonjour {user.first_name},\n\nVoici le lien pour choisir votre accès à Olivor :\n{link}\n\nCe lien est valable 7 jours."
            get_mail_client().send(invitation.sent_to, INVITATION_EMAIL_SUBJECT, body)
        else:
            get_sms_client().send(invitation.sent_to, f"Olivor : choisissez votre code d'accès ici {link}")

    def get_invitation(self, token: str) -> InvitationOut:
        """
        Read what the Invitation page shows: who is invited, by whom, and which secret to choose.

        Args:
            token (str): Plain token from the link.

        Returns:
            InvitationOut: The Invitation as the front shows it.

        Raises:
            AuthError: invalid_invitation when unknown, expired or already used.
        """
        invitation, user = self._get_usable_invitation(token)
        inviter = self.db.get(User, invitation.created_by_id) if invitation.created_by_id else None
        return InvitationOut(
            first_name=user.first_name,
            last_name=user.last_name,
            invited_by=f"{inviter.first_name} {inviter.last_name}" if inviter else "",
            credential_kind=self._get_credential_kind(user),
            identifier=user.phone or user.email or "",
        )

    def accept_invitation(self, token: str, secret: str) -> IssuedLogin:
        """
        Set the secret the invited User chose, activate them, revoke older refresh tokens and log them in.

        Args:
            token (str): Plain token from the link.
            secret (str): PIN or password chosen.

        Returns:
            IssuedLogin: The login result and token pair.

        Raises:
            AuthError: invalid_invitation, or invalid_credential when the secret is too weak.
        """
        invitation, user = self._get_usable_invitation(token)
        auth_service = AuthService(self.db)
        kind = self._get_credential_kind(user)
        if not auth_service.is_secret_strong_enough(kind, secret):
            raise AuthError("invalid_credential", 400)
        credential = self.db.scalar(select(Credential).where(Credential.user_id == user.id, Credential.kind == kind)) or Credential(user_id=user.id, kind=kind, created_by_id=user.id)
        credential.hash = hash_secret(secret)
        credential.updated_by_id = user.id
        self.db.add(credential)
        invitation.accepted_at = datetime.now(timezone.utc)
        user.status = UserStatus.ACTIVE
        user.must_change_credential = False
        user.failed_login_attempts = 0
        user.locked_until = None
        user.token_version += 1
        return auth_service.open_session(user, None)

    def _get_usable_invitation(self, token: str) -> tuple[Invitation, User]:
        """
        Find the Invitation behind a link, refusing one unknown, expired, used, or for a disabled User.

        Args:
            token (str): Plain token from the link.

        Returns:
            tuple[Invitation, User]: The Invitation and its User.

        Raises:
            AuthError: invalid_invitation.
        """
        invitation = self.db.scalar(select(Invitation).where(Invitation.token_hash == hash_token(token)))
        if invitation is None or invitation.accepted_at is not None or invitation.expires_at <= datetime.now(timezone.utc):
            raise AuthError(INVALID_INVITATION_CODE, 404)
        user = self.db.get(User, invitation.user_id)
        if user is None or user.status == UserStatus.DISABLED:
            raise AuthError(INVALID_INVITATION_CODE, 404)
        return invitation, user

    def _get_credential_kind(self, user: User) -> CredentialKind:
        """
        Choose the secret an invited User sets: a PIN when they log in by phone and PIN, otherwise a password.

        Args:
            user (User): Invited User.

        Returns:
            CredentialKind: PIN or password.
        """
        methods = self.db.scalars(select(UserLoginMethod.method).where(UserLoginMethod.user_id == user.id)).all()
        return CredentialKind.PIN if LoginMethod.PHONE_PIN in methods else CredentialKind.PASSWORD


def hash_token(token: str) -> str:
    """
    Hash an Invitation token for storage; the plain token only travels in the message.

    Args:
        token (str): Plain token.

    Returns:
        str: SHA-256 hex digest.
    """
    return hashlib.sha256(token.encode()).hexdigest()


def get_invitation_service(db: Session = Depends(get_db)) -> InvitationService:
    """
    Build the invitation service for one request.

    Args:
        db (Session): Request-scoped database session.

    Returns:
        InvitationService: Service bound to the session.
    """
    return InvitationService(db)
