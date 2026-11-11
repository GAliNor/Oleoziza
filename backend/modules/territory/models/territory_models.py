from decimal import Decimal

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from core.model_mixins import COORDINATE, NAME_LENGTH, IdMixin, SlugIdMixin, TimestampMixin, build_enum_type
from modules.territory.types.territory_types import ProvinceKind


class Province(SlugIdMixin, TimestampMixin, Base):
    """
    One of the eight areas of the Oriental Region, with the position where the map puts its label.
    """

    __tablename__ = "provinces"

    name: Mapped[str] = mapped_column(String(NAME_LENGTH))
    kind: Mapped[ProvinceKind] = mapped_column(build_enum_type(ProvinceKind, "province_kind"))
    latitude: Mapped[Decimal | None] = mapped_column(COORDINATE)
    longitude: Mapped[Decimal | None] = mapped_column(COORDINATE)


class City(IdMixin, TimestampMixin, Base):
    """
    A town of a Province, suggested in the city field of a Location.
    """

    __tablename__ = "cities"
    __table_args__ = (UniqueConstraint("province_id", "name"),)

    province_id: Mapped[str] = mapped_column(ForeignKey("provinces.id"))
    name: Mapped[str] = mapped_column(String(NAME_LENGTH))
