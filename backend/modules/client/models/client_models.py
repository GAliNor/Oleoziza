from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from core.model_mixins import EMAIL_LENGTH, NAME_LENGTH, PHONE_LENGTH, AuditMixin, IdMixin, LocationMixin, OfflineEntryMixin, build_enum_type
from modules.client.types.client_types import ClientKind, ClientStatus
from modules.user.types.user_types import Title


NATIONAL_ID_NUMBER_LENGTH = 10

COMPANY_IDENTIFIER_LENGTH = 15


class Client(IdMixin, AuditMixin, OfflineEntryMixin, LocationMixin, Base):
    """
    An Individual or a Company that brings olives to a Site, shared across all Sites.
    """

    __tablename__ = "clients"
    __table_args__ = (
        CheckConstraint("kind <> 'individual' OR (first_name IS NOT NULL AND last_name IS NOT NULL)", name="individual_has_names"),
        CheckConstraint("kind <> 'company' OR legal_name IS NOT NULL", name="company_has_legal_name"),
    )

    kind: Mapped[ClientKind] = mapped_column(build_enum_type(ClientKind, "client_kind"))
    title: Mapped[Title | None] = mapped_column(build_enum_type(Title, "client_title"))
    first_name: Mapped[str | None] = mapped_column(String(NAME_LENGTH))
    last_name: Mapped[str | None] = mapped_column(String(NAME_LENGTH))
    national_id_number: Mapped[str | None] = mapped_column(String(NATIONAL_ID_NUMBER_LENGTH))
    legal_name: Mapped[str | None] = mapped_column(String(NAME_LENGTH))
    company_identifier: Mapped[str | None] = mapped_column(String(COMPANY_IDENTIFIER_LENGTH))
    phone: Mapped[str] = mapped_column(String(PHONE_LENGTH))
    email: Mapped[str | None] = mapped_column(String(EMAIL_LENGTH))
    status: Mapped[ClientStatus] = mapped_column(build_enum_type(ClientStatus, "client_status"), default=ClientStatus.ACTIVE, server_default=ClientStatus.ACTIVE.value)
    merged_into_id: Mapped[UUID | None] = mapped_column(ForeignKey("clients.id"))
    first_site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"))

    @property
    def display_name(self) -> str:
        """
        Build the name shown on screens: the legal name of a Company, or the title and names of an Individual.

        Returns:
            str: The Client's display name.
        """
        if self.kind == ClientKind.COMPANY:
            return self.legal_name or ""
        name_parts = [self.title.value.capitalize() if self.title else None, self.first_name, self.last_name]
        return " ".join(part for part in name_parts if part)


class ClientContact(IdMixin, AuditMixin, Base):
    """
    A person who speaks for a Company Client, who may also log in through a User.
    """

    __tablename__ = "client_contacts"
    __table_args__ = (CheckConstraint("phone IS NOT NULL OR email IS NOT NULL", name="has_phone_or_email"),)

    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id"))
    title: Mapped[Title | None] = mapped_column(build_enum_type(Title, "client_contact_title"))
    first_name: Mapped[str] = mapped_column(String(NAME_LENGTH))
    last_name: Mapped[str] = mapped_column(String(NAME_LENGTH))
    job_title: Mapped[str | None] = mapped_column(String(NAME_LENGTH))
    phone: Mapped[str | None] = mapped_column(String(PHONE_LENGTH))
    email: Mapped[str | None] = mapped_column(String(EMAIL_LENGTH))
    is_primary: Mapped[bool] = mapped_column(default=False, server_default="false")
