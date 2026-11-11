from enum import StrEnum


class ProvinceKind(StrEnum):
    """
    Whether an area of the Oriental Region is a province or a prefecture.
    """

    PROVINCE = "province"
    PREFECTURE = "prefecture"
