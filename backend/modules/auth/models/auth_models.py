from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from core.model_mixins import EMAIL_LENGTH, HASH_LENGTH, AuditMixin, IdMixin, TimestampMixin, build_enum_type
from modules.auth.types.auth_types import CredentialKind, MessageChannel, OneTimeCodePurpose


class Credential(IdMixin, AuditMixin, Base):
    """
    A User's PIN or password hash; never sent to the front. Who set it last is updated_by.
    """

    __tablename__ = "credentials"
    __table_args__ = (UniqueConstraint("user_id", "kind"),)

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[CredentialKind] = mapped_column(build_enum_type(CredentialKind, "credential_kind"))
    hash: Mapped[str] = mapped_column(String(HASH_LENGTH))


class OneTimeCode(IdMixin, TimestampMixin, Base):
    """
    A single-use SMS code or email link to log in or reset a credential.
    """

    __tablename__ = "one_time_codes"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    purpose: Mapped[OneTimeCodePurpose] = mapped_column(build_enum_type(OneTimeCodePurpose, "one_time_code_purpose"))
    channel: Mapped[MessageChannel] = mapped_column(build_enum_type(MessageChannel, "one_time_code_channel"))
    code_hash: Mapped[str] = mapped_column(String(HASH_LENGTH))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Invitation(IdMixin, AuditMixin, Base):
    """
    The SMS or email that lets a new User set their own PIN or password; sent by created_by, at created_at.
    """

    __tablename__ = "invitations"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    channel: Mapped[MessageChannel] = mapped_column(build_enum_type(MessageChannel, "invitation_channel"))
    sent_to: Mapped[str] = mapped_column(String(EMAIL_LENGTH))
    token_hash: Mapped[str] = mapped_column(String(HASH_LENGTH), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

