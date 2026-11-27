from dataclasses import dataclass
from typing import Any
from uuid import UUID

from core.exceptions import RefusedError
from modules.assistant.business.query_filters import compile_filter
from modules.assistant.business.semantic_layer import ENTITIES
from modules.assistant.types.assistant_types import MAXIMUM_ROWS, AnswerReporting, BusinessQuery, FilterOperator, QueryFilter
from modules.assistant.types.semantic_types import FieldKind, SemanticEntity


@dataclass(frozen=True)
class QueryScope:
    site_ids: list[UUID]
    can_see_money: bool


@dataclass(frozen=True)
class CompiledQuery:
    sql: str
    params: dict[str, Any]
    columns: list[tuple[str, str]]
    entity: SemanticEntity
    is_aggregate: bool
    row_limit: int = MAXIMUM_ROWS
    reporting: AnswerReporting | None = None


def get_entity(name: str) -> SemanticEntity:
    """
    Find a declared entity.

    Args:
        name (str): Entity name.

    Returns:
        SemanticEntity: The entity.

    Raises:
        RefusedError: assistant_unknown_entity (422).
    """
    entity = ENTITIES.get(name)
    if entity is None:
        raise RefusedError("assistant_unknown_entity", 422, {"entity": name})
    return entity


def apply_default_filters(query: BusinessQuery, entity: SemanticEntity) -> list[QueryFilter]:
    """
    Add an entity's ordinary defaults (active Clients, confirmed Payments, recorded Expenses…) unless the query filters that field itself.

    Args:
        query (BusinessQuery): Planned query.
        entity (SemanticEntity): Its entity.

    Returns:
        list[QueryFilter]: The filters to apply.
    """
    filtered = {item.field for item in query.filters}
    defaults = [QueryFilter(field=name, op=FilterOperator.EQ, value=value) for name, value in entity.default_filters if name not in filtered]
    return [*query.filters, *defaults]


def is_measure_filter(item: QueryFilter, query: BusinessQuery, entity: SemanticEntity) -> bool:
    """
    Tell whether a filter compares an aggregate (HAVING): a measure name in a grouped query, or a name that is only a measure.

    Args:
        item (QueryFilter): The filter.
        query (BusinessQuery): Its query.
        entity (SemanticEntity): Its entity.

    Returns:
        bool: True for a HAVING predicate.
    """
    return item.field in entity.measures and (bool(query.measures) or item.field not in entity.fields)


def check_money(query: BusinessQuery, entity: SemanticEntity, scope: QueryScope) -> None:
    """
    Refuse a query touching money for a User without the finance-view Permission on every Site in scope (D4).

    Args:
        query (BusinessQuery): Planned query.
        entity (SemanticEntity): Its entity.
        scope (QueryScope): The asker's Sites and money visibility.

    Raises:
        RefusedError: assistant_finance_forbidden (403).
    """
    if scope.can_see_money:
        return
    names = {*query.fields, *query.measures, *(item.field for item in query.filters), *([query.order_by.field] if query.order_by else [])}
    touches_money = entity.is_money or any(getattr(entity.fields.get(name) or entity.measures.get(name), "is_money", False) for name in names)
    if touches_money:
        raise RefusedError("assistant_finance_forbidden", 403)


def build_select(query: BusinessQuery, entity: SemanticEntity) -> tuple[list[str], list[tuple[str, str]]]:
    """
    Build the SELECT list and output columns from declared fields and measures only.

    Args:
        query (BusinessQuery): Planned query.
        entity (SemanticEntity): Its entity.

    Returns:
        tuple[list[str], list[tuple[str, str]]]: SQL items and (column, kind) pairs.

    Raises:
        RefusedError: assistant_unknown_field, assistant_empty_query.
    """
    items: list[str] = []
    columns: list[tuple[str, str]] = []
    for name in dict.fromkeys(query.fields):
        field = entity.fields.get(name)
        if field is None:
            raise RefusedError("assistant_unknown_field", 422, {"entity": entity.name, "field": name})
        items.append(f'{field.sql} AS "{name}"')
        columns.append((name, field.kind))
    for name in dict.fromkeys(query.measures):
        measure = entity.measures.get(name)
        if measure is None:
            raise RefusedError("assistant_unknown_field", 422, {"entity": entity.name, "field": name})
        items.append(f'COALESCE({measure.sql}, 0) AS "{name}"')
        columns.append((name, measure.kind))
    if not query.measures:
        items.extend([f'{entity.id_sql} AS "_id"', f'{entity.label_sql} AS "_label"'])
        if entity.link_sql:
            items.append(f'{entity.link_sql} AS "_link"')
    if not items:
        raise RefusedError("assistant_empty_query", 422)
    return items, columns


def build_order(query: BusinessQuery, entity: SemanticEntity, columns: list[tuple[str, str]]) -> str:
    """
    Order rows by the asked column, then by a unique key so pages and answers are stable.

    Args:
        query (BusinessQuery): Planned query.
        entity (SemanticEntity): Its entity.
        columns (list[tuple[str, str]]): Output columns.

    Returns:
        str: The ORDER BY clause.

    Raises:
        RefusedError: assistant_order_field_invalid (422).
    """
    group_positions = [str(position) for position in range(1, len(query.fields) + 1)]
    if query.order_by is None:
        return f" ORDER BY {entity.id_sql}" if not query.measures else (" ORDER BY " + ", ".join(group_positions) if group_positions else "")
    name = query.order_by.field
    if name in {key for key, _ in columns}:
        expression = f'"{name}"'
    elif not query.measures and name in entity.fields:
        expression = entity.fields[name].sql
    else:
        raise RefusedError("assistant_order_field_invalid", 422, {"field": name})
    direction = "DESC" if query.order_by.direction == "desc" else "ASC"
    tie_breakers = [entity.id_sql] if not query.measures else group_positions
    return f" ORDER BY {expression} {direction} NULLS LAST" + "".join(f", {item}" for item in tie_breakers)


def build_reporting(query: BusinessQuery) -> AnswerReporting | None:
    """
    Tell which dates a figure covers, from the date window frozen into its filters.

    Args:
        query (BusinessQuery): Normalized query.

    Returns:
        AnswerReporting | None: Date field and bounds, or None without a date window.
    """
    if not query.date_field:
        return None
    bounds = [item for item in query.filters if item.field == query.date_field]
    if not bounds:
        return None
    return AnswerReporting(
        date_field=query.date_field,
        from_date=next((item.value for item in bounds if item.op == FilterOperator.GTE), None),
        to_date=next((item.value for item in bounds if item.op == FilterOperator.LT), None),
    )


def compile_query(query: BusinessQuery, scope: QueryScope) -> CompiledQuery:
    """
    Compile a business query into one read-only SELECT: only names declared in the semantic layer reach SQL, values are bound, the asker's Sites always limit it, and a row cap ends it.

    Args:
        query (BusinessQuery): Normalized query (dates frozen, references resolved).
        scope (QueryScope): The asker's Sites and money visibility.

    Returns:
        CompiledQuery: SQL, parameters, output columns and the entity.

    Raises:
        RefusedError: assistant_unknown_entity, assistant_unknown_field, assistant_filter_on_measure, assistant_finance_forbidden, assistant_order_field_invalid.
    """
    entity = get_entity(query.entity)
    check_money(query, entity, scope)
    items, columns = build_select(query, entity)
    params: dict[str, Any] = {"scope_site_ids": [str(site_id) for site_id in scope.site_ids]}
    filters = apply_default_filters(query, entity)
    conditions = [f"{entity.site_sql} = ANY(CAST(:scope_site_ids AS uuid[]))"]
    measure_filters = [(index, item) for index, item in enumerate(filters) if is_measure_filter(item, query, entity)]
    measure_indexes = {index for index, _ in measure_filters}
    conditions.extend(compile_filter(entity, item, index, params) for index, item in enumerate(filters) if index not in measure_indexes)
    if measure_filters and not query.measures:
        raise RefusedError("assistant_filter_on_measure", 422)
    having = [compile_filter(entity, item, index, params, allow_measure=True) for index, item in measure_filters]
    sql = f"SELECT {', '.join(items)} FROM {entity.from_sql} WHERE {' AND '.join(conditions)}"
    if query.measures and query.fields:
        sql += " GROUP BY " + ", ".join(str(position) for position in range(1, len(query.fields) + 1))
    if having:
        sql += " HAVING " + " AND ".join(having)
    sql += build_order(query, entity, columns)
    row_limit = max(1, min(query.limit, MAXIMUM_ROWS))
    params["row_limit"] = row_limit + 1
    sql += " LIMIT :row_limit"
    return CompiledQuery(sql=sql, params=params, columns=columns, entity=entity, is_aggregate=bool(query.measures), row_limit=row_limit, reporting=build_reporting(query))


def pin_record(query: BusinessQuery, entity_name: str, record_id: str) -> BusinessQuery:
    """
    Replace a name search on a chosen record by its id, so a clarified plan runs again without asking the model.

    Args:
        query (BusinessQuery): A planned query.
        entity_name (str): Entity of the chosen record.
        record_id (str): Its id.

    Returns:
        BusinessQuery: The query, pinned to the record where it searched for it by name.
    """
    entity = ENTITIES.get(query.entity)
    if entity is None:
        return query
    id_field = "id" if query.entity == entity_name else entity.references.get(entity_name)
    if id_field is None or id_field not in entity.fields or entity.fields[id_field].kind != FieldKind.ID:
        return query
    searched = {"name", "code"} if query.entity == entity_name else {f"{entity_name}_name"}
    kept = [item for item in query.filters if not (item.op == FilterOperator.MATCHES and item.field in searched)]
    kept.append(QueryFilter(field=id_field, op=FilterOperator.EQ, value=record_id))
    return query.model_copy(update={"filters": kept, "expects_one_record": False})
