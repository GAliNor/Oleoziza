from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from core.model_mixins import ADDRESS_LENGTH, EMAIL_LENGTH, NAME_LENGTH, PHONE_LENGTH, AuditMixin, IdMixin, build_enum_type
from modules.user.types.user_types import Language, LoginMethod, Permission, Role, Title, UserStatus


class User(IdMixin, AuditMixin, Base):
    """
    A person who can log in: Management, an Operator, an Accountant, or someone speaking for a Client.
    """

    __tablename__ = "users"
    __table_args__ = (CheckConstraint("phone IS NOT NULL OR email IS NOT NULL", name="has_phone_or_email"),)

    role: Mapped[Role] = mapped_column(build_enum_type(Role, "user_role"))
    is_owner: Mapped[bool] = mapped_column(default=False, server_default="false")
    client_id: Mapped[UUID | None] = mapped_column(ForeignKey("clients.id", use_alter=True))
    client_contact_id: Mapped[UUID | None] = mapped_column(ForeignKey("client_contacts.id", use_alter=True))
    title: Mapped[Title | None] = mapped_column(build_enum_type(Title, "user_title"))
    first_name: Mapped[str] = mapped_column(String(NAME_LENGTH))
    last_name: Mapped[str] = mapped_column(String(NAME_LENGTH))
    phone: Mapped[str | None] = mapped_column(String(PHONE_LENGTH), unique=True)
    email: Mapped[str | None] = mapped_column(String(EMAIL_LENGTH), unique=True)
    province_id: Mapped[str | None] = mapped_column(ForeignKey("provinces.id"))
    city: Mapped[str | None] = mapped_column(String(NAME_LENGTH))
    address: Mapped[str | None] = mapped_column(String(ADDRESS_LENGTH))
    language: Mapped[Language] = mapped_column(build_enum_type(Language, "user_language"), default=Language.FR, server_default=Language.FR.value)
    status: Mapped[UserStatus] = mapped_column(build_enum_type(UserStatus, "user_status"), default=UserStatus.INVITED, server_default=UserStatus.INVITED.value)
    must_change_credential: Mapped[bool] = mapped_column(default=False, server_default="false")
    failed_login_attempts: Mapped[int] = mapped_column(default=0, server_default="0")
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    disabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    token_version: Mapped[int] = mapped_column(default=0, server_default="0")


class UserLoginMethod(IdMixin, AuditMixin, Base):
    """
    One way a User is allowed to log in, chosen by Management.
    """

    __tablename__ = "user_login_methods"
    __table_args__ = (UniqueConstraint("user_id", "method"),)

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    method: Mapped[LoginMethod] = mapped_column(build_enum_type(LoginMethod, "user_login_method_method"))


class SiteAssignment(IdMixin, AuditMixin, Base):
    """
    A staff User's access to one Site; Client Users have none.
    """

    __tablename__ = "site_assignments"
    __table_args__ = (UniqueConstraint("user_id", "site_id"),)

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"))


class SiteAssignmentPermission(IdMixin, AuditMixin, Base):
    """
    One right a staff User holds on the Site of their assignment.
    """

    __tablename__ = "site_assignment_permissions"
    __table_args__ = (UniqueConstraint("site_assignment_id", "permission"),)

    site_assignment_id: Mapped[UUID] = mapped_column(ForeignKey("site_assignments.id", ondelete="CASCADE"))
    permission: Mapped[Permission] = mapped_column(build_enum_type(Permission, "site_assignment_permission_permission"))
