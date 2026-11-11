from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from core.model_mixins import NAME_LENGTH, PHONE_LENGTH, REFERENCE_LENGTH, AuditMixin, IdMixin, LocationMixin, TimestampMixin, build_enum_type
from modules.site.types.site_types import CodeKind, SeasonStatus, SiteStatus


SITE_CODE_LENGTH = 2

SEASON_CODE_LENGTH = 4


class Site(IdMixin, AuditMixin, LocationMixin, Base):
    """
    One mill of the owner, with its own Operators, activity, stock and treasury.
    """

    __tablename__ = "sites"

    code: Mapped[str] = mapped_column(String(SITE_CODE_LENGTH), unique=True)
    name: Mapped[str] = mapped_column(String(NAME_LENGTH))
    phone: Mapped[str | None] = mapped_column(String(PHONE_LENGTH))
    tax_identifier: Mapped[str | None] = mapped_column(String(REFERENCE_LENGTH))
    company_identifier: Mapped[str | None] = mapped_column(String(REFERENCE_LENGTH))
    onssa_authorisation: Mapped[str | None] = mapped_column(String(REFERENCE_LENGTH))
    status: Mapped[SiteStatus] = mapped_column(build_enum_type(SiteStatus, "site_status"), default=SiteStatus.ACTIVE, server_default=SiteStatus.ACTIVE.value)


class Season(IdMixin, AuditMixin, Base):
    """
    One harvest campaign shared by every Site, prepared ahead, opened, then closed by Management; ends_on is the planned end, closed_at the actual one.
    """

    __tablename__ = "seasons"
    __table_args__ = (
        Index("uq_seasons_single_open", "status", unique=True, postgresql_where=text("status = 'open'")),
        Index("uq_seasons_single_planned", "status", unique=True, postgresql_where=text("status = 'planned'")),
    )

    code: Mapped[str] = mapped_column(String(SEASON_CODE_LENGTH), unique=True)
    label: Mapped[str] = mapped_column(String(NAME_LENGTH))
    starts_on: Mapped[date] = mapped_column(Date)
    ends_on: Mapped[date | None] = mapped_column(Date)
    status: Mapped[SeasonStatus] = mapped_column(build_enum_type(SeasonStatus, "season_status"), default=SeasonStatus.OPEN, server_default=SeasonStatus.OPEN.value)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    illustration_file_id: Mapped[UUID | None] = mapped_column(ForeignKey("files.id"))
    illustration_dark_file_id: Mapped[UUID | None] = mapped_column(ForeignKey("files.id"))


class CodeSequence(IdMixin, TimestampMixin, Base):
    """
    The last number given to one kind of record on one Site in one Season, so the server hands out the next code at sync.
    """

    __tablename__ = "code_sequences"
    __table_args__ = (UniqueConstraint("site_id", "season_id", "kind"),)

    site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"))
    season_id: Mapped[UUID] = mapped_column(ForeignKey("seasons.id"))
    kind: Mapped[CodeKind] = mapped_column(build_enum_type(CodeKind, "code_sequence_kind"))
    last_number: Mapped[int] = mapped_column(default=0, server_default="0")
