from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

from core.exceptions import RefusedError
from modules.assistant.types.assistant_types import FilterOperator, QueryFilter
from modules.assistant.types.semantic_types import NUMERIC_KINDS, FieldKind, SemanticEntity, SemanticField, SemanticMeasure


COMPARISON_SQL = {FilterOperator.EQ: "=", FilterOperator.NEQ: "<>", FilterOperator.GT: ">", FilterOperator.GTE: ">=", FilterOperator.LT: "<", FilterOperator.LTE: "<="}

CAST_BY_KIND = {**{kind: "numeric" for kind in NUMERIC_KINDS}, FieldKind.DATE: "date", FieldKind.ID: "uuid"}

MAXIMUM_MATCH_WORDS = 6

MAXIMUM_IN_VALUES = 50


def validate_filter_value(value: str, kind: FieldKind, enum_values: tuple[str, ...]) -> None:
    """
    Check a value can be what its field holds before PostgreSQL sees it.

    Args:
        value (str): One filter value.
        kind (FieldKind): Declared kind.
        enum_values (tuple[str, ...]): Accepted values of an enum.

    Raises:
        RefusedError: assistant_filter_value_invalid (422).
    """
    try:
        if kind == FieldKind.DATE:
            if date.fromisoformat(value).isoformat() != value:
                raise ValueError("Date must use YYYY-MM-DD")
        elif kind in NUMERIC_KINDS:
            if not Decimal(value).is_finite():
                raise ValueError("Non-finite number")
        elif kind == FieldKind.ID:
            UUID(value)
        elif enum_values and value not in enum_values:
            raise ValueError("Unknown enum value")
    except (ValueError, InvalidOperation) as error:
        raise RefusedError("assistant_filter_value_invalid", 422, {"kind": str(kind), "value": value[:40]}) from error


def compile_match(sql: str, value: str, name: str, params: dict[str, Any]) -> str:
    """
    Match every word of a name, ignoring accents and case.

    Args:
        sql (str): Trusted text expression.
        value (str): Words searched.
        name (str): Parameter prefix.
        params (dict[str, Any]): Bound parameters, filled here.

    Returns:
        str: SQL predicate.

    Raises:
        RefusedError: assistant_filter_value_invalid when no word is given.
    """
    words = [word for word in value.split() if word][:MAXIMUM_MATCH_WORDS]
    if not words:
        raise RefusedError("assistant_filter_value_invalid", 422)
    conditions = []
    for index, word in enumerate(words):
        escaped = word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        params[f"{name}_{index}"] = f"%{escaped}%"
        conditions.append(f"unaccent(({sql})::text) ILIKE unaccent(:{name}_{index})")
    return "(" + " AND ".join(conditions) + ")"


def compile_filter(entity: SemanticEntity, query_filter: QueryFilter, index: int, params: dict[str, Any], allow_measure: bool = False) -> str:
    """
    Compile one declared comparison into SQL with bound, checked values.

    Args:
        entity (SemanticEntity): Queried entity.
        query_filter (QueryFilter): The comparison.
        index (int): Parameter namespace.
        params (dict[str, Any]): Bound parameters, filled here.
        allow_measure (bool): True when building a HAVING predicate, where a name that is both a field and a measure means the measure.

    Returns:
        str: SQL predicate built only from declared expressions.

    Raises:
        RefusedError: assistant_unknown_field, assistant_filter_on_measure, assistant_filter_operator_invalid, assistant_filter_value_invalid.
    """
    item: SemanticField | SemanticMeasure | None = entity.measures.get(query_filter.field) if allow_measure else entity.fields.get(query_filter.field)
    if item is None:
        if query_filter.field not in entity.measures and query_filter.field not in entity.fields:
            raise RefusedError("assistant_unknown_field", 422, {"entity": entity.name, "field": query_filter.field})
        raise RefusedError("assistant_filter_on_measure", 422, {"field": query_filter.field})
    name = f"f{index}"
    if query_filter.op in (FilterOperator.IS_EMPTY, FilterOperator.IS_NOT_EMPTY):
        return f"({item.sql}) IS {'NOT ' if query_filter.op == FilterOperator.IS_NOT_EMPTY else ''}NULL"
    if query_filter.op == FilterOperator.MATCHES:
        if item.kind != FieldKind.TEXT:
            raise RefusedError("assistant_filter_operator_invalid", 422, {"field": query_filter.field})
        return compile_match(item.sql, query_filter.value, name, params)
    enum_values = item.values if isinstance(item, SemanticField) else ()
    cast = CAST_BY_KIND.get(item.kind)
    values = [value.strip() for value in query_filter.value.split(",")] if query_filter.op == FilterOperator.IN else [query_filter.value.strip()]
    if not values or len(values) > MAXIMUM_IN_VALUES:
        raise RefusedError("assistant_filter_value_invalid", 422)
    for value in values:
        validate_filter_value(value, item.kind, enum_values)
    if query_filter.op == FilterOperator.IN:
        placeholders = []
        for value_index, value in enumerate(values):
            params[f"{name}_{value_index}"] = value
            placeholders.append(f"CAST(:{name}_{value_index} AS {cast})" if cast else f"lower(:{name}_{value_index})")
        left = f"({item.sql})" if cast else f"lower(({item.sql})::text)"
        return f"{left} IN ({', '.join(placeholders)})"
    params[name] = values[0]
    if cast:
        return f"({item.sql}) {COMPARISON_SQL[query_filter.op]} CAST(:{name} AS {cast})"
    return f"lower(({item.sql})::text) {COMPARISON_SQL[query_filter.op]} lower(:{name})"
