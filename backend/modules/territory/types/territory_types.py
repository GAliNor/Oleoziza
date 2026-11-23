from enum import StrEnum
from typing import Any

from pydantic import Field

from core.types import CamelModel


class ProvinceKind(StrEnum):
    """
    Whether an area of the Oriental Region is a province or a prefecture.
    """

    PROVINCE = "province"
    PREFECTURE = "prefecture"


class ProvinceOut(CamelModel):
    """
    A Province as the location fields and the map read it: its label position as [longitude, latitude], its outline and its main towns in order.
    """

    id: str
    name: str
    kind: ProvinceKind
    label_at: tuple[float, float] | None
    boundary: dict[str, Any] | None
    cities: list[str]


class LocationOut(CamelModel):
    """
    Where a Site, Client or staff User is: a Province of the Oriental, a town and an address.
    """

    province: str | None
    city: str
    address: str


class OptionalLocationIn(CamelModel):
    """
    A Location of which any part may be missing, such as a Client's.
    """

    province: str | None = None
    city: str = Field(default="", max_length=120)
    address: str = Field(default="", max_length=255)


class LocationIn(CamelModel):
    """
    A Location as typed in the location fields: the Province, town and address are all required.
    """

    province: str = Field(min_length=1)
    city: str = Field(min_length=1, max_length=120)
    address: str = Field(min_length=1, max_length=255)
