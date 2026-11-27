import re

from core.exceptions import RefusedError
from modules.assistant.business.date_rules import HOME_TO_PLAN_PERIOD, PeriodContext, resolve_period
from modules.assistant.business.query_compiler import QueryScope, compile_query, get_entity
from modules.assistant.types.assistant_types import AssistantPlan, BlockType, BusinessQuery, FilterOperator, QueryFilter
from modules.assistant.types.semantic_types import FieldKind, SemanticEntity


REFERENCE_PATTERN = re.compile(r"^\{(q[1-4])\.([a-z_]+)\}$")

PLACEHOLDER_PATTERN = re.compile(r"\{(q[1-4]|c[1-2])\.([a-z_]+)\}")

COMPARE_SUFFIXES = ("_previous", "_change_pct")


def has_date_filter(query: BusinessQuery, entity: SemanticEntity) -> bool:
    """
    Tell whether a query already limits a date itself, so no default period is added.

    Args:
        query (BusinessQuery): Planned query.
        entity (SemanticEntity): Its entity.

    Returns:
        bool: True when a filter compares a date field.
    """
    return any(item.field in entity.fields and entity.fields[item.field].kind == FieldKind.DATE and item.op not in (FilterOperator.IS_EMPTY, FilterOperator.IS_NOT_EMPTY) for item in query.filters)


def list_output_columns(query: BusinessQuery) -> set[str]:
    """
    Name the columns a query returns, comparison columns included.

    Args:
        query (BusinessQuery): Planned query.

    Returns:
        set[str]: Column names.
    """
    columns = {*query.fields, *query.measures}
    if query.compare:
        columns |= {f"{measure}{suffix}" for measure in query.measures for suffix in COMPARE_SUFFIXES}
    return columns


def normalize_query(query: BusinessQuery, context: PeriodContext, home_period: str) -> BusinessQuery:
    """
    Freeze the query's period into date filters, defaulting to the Home's period for dated entities, so a reopened answer never drifts.

    Args:
        query (BusinessQuery): Model-planned query.
        context (PeriodContext): Today and the Season starts.
        home_period (str): Period selected on the Home when the question was asked.

    Returns:
        BusinessQuery: Query with absolute dates and its date field.

    Raises:
        RefusedError: assistant_unknown_entity, assistant_date_field_invalid, assistant_compare_invalid.
    """
    entity = get_entity(query.entity)
    if query.date_field and (query.date_field not in entity.fields or entity.fields[query.date_field].kind != FieldKind.DATE):
        raise RefusedError("assistant_date_field_invalid", 422, {"field": query.date_field})
    date_field = query.date_field or entity.default_date_field
    period = query.period
    if period is None and date_field and not has_date_filter(query, entity):
        period = HOME_TO_PLAN_PERIOD[home_period]
    filters = list(query.filters)
    window = resolve_period(period, context) if period and date_field else None
    if window:
        filters.extend([QueryFilter(field=date_field, op=FilterOperator.GTE, value=window[0].isoformat()), QueryFilter(field=date_field, op=FilterOperator.LT, value=window[1].isoformat())])
    if query.compare and (not window or not query.measures):
        raise RefusedError("assistant_compare_invalid", 422)
    unique = {(item.field, item.op, item.value): item for item in filters}
    return query.model_copy(update={"filters": list(unique.values()), "period": None, "date_field": date_field if window or has_date_filter(query, entity) else None})


def check_references(queries: list[BusinessQuery]) -> None:
    """
    Check every `{qN.column}` filter value points to an earlier query's column.

    Args:
        queries (list[BusinessQuery]): Normalized queries, in order.

    Raises:
        RefusedError: assistant_reference_invalid (422).
    """
    seen: dict[str, BusinessQuery] = {}
    for query in queries:
        for item in query.filters:
            match = REFERENCE_PATTERN.match(item.value)
            if match and (match.group(1) not in seen or match.group(2) not in list_output_columns(seen[match.group(1)])):
                raise RefusedError("assistant_reference_invalid", 422, {"reference": item.value})
        seen[query.id] = query


def check_bindings(plan: AssistantPlan) -> None:
    """
    Check the message placeholders and blocks only name data the plan produces.

    Args:
        plan (AssistantPlan): Normalized plan.

    Raises:
        RefusedError: assistant_message_binding_invalid, assistant_block_binding_invalid, assistant_cards_require_records.
    """
    queries = {query.id: query for query in plan.queries}
    calcs = {calc.id for calc in plan.calcs}
    for source, column in PLACEHOLDER_PATTERN.findall(plan.message):
        if source in calcs:
            if column != "value":
                raise RefusedError("assistant_message_binding_invalid", 422, {"placeholder": f"{source}.{column}"})
            continue
        query = queries.get(source)
        if query is None or column not in {*list_output_columns(query), "rows"}:
            raise RefusedError("assistant_message_binding_invalid", 422, {"placeholder": f"{source}.{column}"})
    for block in plan.blocks:
        if block.query_id in calcs:
            if block.type != BlockType.NUMBER:
                raise RefusedError("assistant_block_binding_invalid", 422)
            continue
        query = queries[block.query_id]
        available = list_output_columns(query)
        if any(name is not None and name not in available for name in (block.label_field, block.value_field)):
            raise RefusedError("assistant_block_binding_invalid", 422)
        if block.type == BlockType.CARDS and query.measures:
            raise RefusedError("assistant_cards_require_records", 422)


def normalize_plan(plan: AssistantPlan, context: PeriodContext, home_period: str) -> AssistantPlan:
    """
    Freeze dates, then check references and bindings, without reading the question's wording.

    Args:
        plan (AssistantPlan): Structured model answer.
        context (PeriodContext): Today and the Season starts.
        home_period (str): Home period at asking time.

    Returns:
        AssistantPlan: A runnable plan whose saved dates will not drift.
    """
    queries = [normalize_query(query, context, home_period) for query in plan.queries]
    normalized = plan.model_copy(update={"queries": queries})
    check_references(queries)
    check_bindings(normalized)
    check_compiles(queries)
    return normalized


def check_compiles(queries: list[BusinessQuery]) -> None:
    """
    Compile every query once (references left out, money allowed), so a wrong name is caught while the model can still correct it; Site scope and money are enforced when the plan runs.

    Args:
        queries (list[BusinessQuery]): Normalized queries.

    Raises:
        RefusedError: Any compiler refusal.
    """
    for query in queries:
        compile_query(query.model_copy(update={"filters": [item for item in query.filters if not REFERENCE_PATTERN.match(item.value)]}), QueryScope(site_ids=[], can_see_money=True))
