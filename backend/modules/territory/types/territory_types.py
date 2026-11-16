from enum import StrEnum
from typing import Any

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
