from dataclasses import dataclass, field
from enum import StrEnum


class FieldKind(StrEnum):
    TEXT = "text"
    ENUM = "enum"
    NUMBER = "number"
    AMOUNT = "amount"
    LITRES = "litres"
    KILOGRAMS = "kilograms"
    DAYS = "days"
    DATE = "date"
    ID = "id"


NUMERIC_KINDS = (FieldKind.NUMBER, FieldKind.AMOUNT, FieldKind.LITRES, FieldKind.KILOGRAMS, FieldKind.DAYS)


@dataclass(frozen=True)
class SemanticField:
    sql: str
    kind: FieldKind
    description: str
    values: tuple[str, ...] = ()
    is_money: bool = False


@dataclass(frozen=True)
class SemanticMeasure:
    sql: str
    kind: FieldKind
    description: str
    is_money: bool = False


@dataclass(frozen=True)
class SemanticEntity:
    name: str
    description: str
    from_sql: str
    id_sql: str
    label_sql: str
    site_sql: str
    fields: dict[str, SemanticField]
    measures: dict[str, SemanticMeasure]
    default_date_field: str | None = None
    link_sql: str | None = None
    default_filters: tuple[tuple[str, str], ...] = ()
    is_money: bool = False
    references: dict[str, str] = field(default_factory=dict)
