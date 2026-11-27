from collections.abc import Callable
from dataclasses import dataclass, field, replace
from datetime import date
from decimal import Decimal
from typing import Any

from core.exceptions import RefusedError
from modules.assistant.business.date_rules import PeriodContext, shift_window
from modules.assistant.business.plan_rules import REFERENCE_PATTERN
from modules.assistant.business.query_compiler import CompiledQuery, QueryScope, compile_query
from modules.assistant.types.assistant_types import AssistantPlan, BusinessQuery, CalcOperator, FilterOperator, PlanCalc, QueryFilter
from modules.assistant.types.semantic_types import NUMERIC_KINDS, FieldKind


RowReader = Callable[[str, dict[str, Any]], list[dict[str, Any]]]


@dataclass
class PlanResults:
    queries: dict[str, tuple[CompiledQuery, list[dict[str, Any]]]] = field(default_factory=dict)
    calcs: dict[str, tuple[Any, str]] = field(default_factory=dict)
    stop_reason: str | None = None
    stop_query: tuple[CompiledQuery, list[dict[str, Any]]] | None = None


def resolve_references(query: BusinessQuery, results: PlanResults) -> BusinessQuery | None:
    """
    Fill `{qN.column}` filter values with an earlier query's values: equal for one, any of them for several.

    Args:
        query (BusinessQuery): Query to run.
        results (PlanResults): Earlier results.

    Returns:
        BusinessQuery | None: The query with values, or None when a referenced query found nothing (the query is skipped).
    """
    filters: list[QueryFilter] = []
    for item in query.filters:
        match = REFERENCE_PATTERN.match(item.value)
        if not match:
            filters.append(item)
            continue
        _, rows = results.queries[match.group(1)]
        values = list(dict.fromkeys(str(row[match.group(2)]) for row in rows if row.get(match.group(2)) is not None))
        if not values:
            return None
        operator = FilterOperator.IN if len(values) > 1 and item.op in (FilterOperator.EQ, FilterOperator.IN) else item.op
        filters.append(QueryFilter(field=item.field, op=operator, value=",".join(values) if operator == FilterOperator.IN else values[0]))
    return query.model_copy(update={"filters": filters})


def shift_query(query: BusinessQuery, context: PeriodContext) -> BusinessQuery:
    """
    Move a query's frozen date window to the window it compares with.

    Args:
        query (BusinessQuery): Normalized query with a date window and compare.
        context (PeriodContext): Season starts.

    Returns:
        BusinessQuery: The same query on the earlier window.
    """
    bounds = {item.op: item for item in query.filters if item.field == query.date_field}
    starts_on, ends_before = date.fromisoformat(bounds[FilterOperator.GTE].value), date.fromisoformat(bounds[FilterOperator.LT].value)
    previous_start, previous_end = shift_window(starts_on, ends_before, query.compare or "previous_period", context)
    kept = [item for item in query.filters if item.field != query.date_field]
    kept.extend([QueryFilter(field=query.date_field, op=FilterOperator.GTE, value=previous_start.isoformat()), QueryFilter(field=query.date_field, op=FilterOperator.LT, value=previous_end.isoformat())])
    return query.model_copy(update={"filters": kept, "compare": None})


def merge_comparison(query: BusinessQuery, compiled: CompiledQuery, rows: list[dict[str, Any]], previous_rows: list[dict[str, Any]]) -> tuple[CompiledQuery, list[dict[str, Any]]]:
    """
    Add each measure's earlier value and its change in percent, matching rows on their group fields.

    Args:
        query (BusinessQuery): The compared query.
        compiled (CompiledQuery): Its compiled form.
        rows (list[dict[str, Any]]): Current rows.
        previous_rows (list[dict[str, Any]]): Rows of the earlier window.

    Returns:
        tuple[CompiledQuery, list[dict[str, Any]]]: Columns and rows with `<measure>_previous` and `<measure>_change_pct`.
    """
    kinds = dict(compiled.columns)
    previous_by_key = {tuple(row.get(name) for name in query.fields): row for row in previous_rows}
    merged = []
    for row in rows:
        earlier = previous_by_key.get(tuple(row.get(name) for name in query.fields), {})
        extra: dict[str, Any] = {}
        for measure in query.measures:
            current, before = row.get(measure) or 0, earlier.get(measure) or 0
            extra[f"{measure}_previous"] = before
            extra[f"{measure}_change_pct"] = round(float((Decimal(str(current)) - Decimal(str(before))) / Decimal(str(before)) * 100), 1) if before else None
        merged.append({**row, **extra})
    columns = [*compiled.columns, *[(f"{measure}{suffix}", kinds[measure] if suffix == "_previous" else FieldKind.NUMBER) for measure in query.measures for suffix in ("_previous", "_change_pct")]]
    return replace(compiled, columns=columns), merged


def read_operand(operand: str, results: PlanResults) -> tuple[Any, str]:
    """
    Read one side of a calc: an earlier single value, today, a date or a number.

    Args:
        operand (str): `{qN.column}`, `{cN.value}`, `today` (filled by the caller), YYYY-MM-DD or a number.
        results (PlanResults): Values computed so far.

    Returns:
        tuple[Any, str]: The value and its kind.

    Raises:
        RefusedError: assistant_calc_invalid (422).
    """
    if operand == "today":
        return None, FieldKind.DATE
    if operand.startswith("{c") and operand[1:3] in results.calcs:
        return results.calcs[operand[1:3]]
    match = REFERENCE_PATTERN.match(operand)
    if match:
        compiled, rows = results.queries.get(match.group(1), (None, []))
        if compiled is None:
            raise RefusedError("assistant_calc_invalid", 422, {"operand": operand})
        kind = dict(compiled.columns).get(match.group(2), FieldKind.NUMBER)
        value = rows[0].get(match.group(2)) if rows else None
        return (value if value is not None else (0 if kind in NUMERIC_KINDS else None)), kind
    try:
        return date.fromisoformat(operand), FieldKind.DATE
    except ValueError:
        pass
    try:
        return Decimal(operand), FieldKind.NUMBER
    except ArithmeticError as error:
        raise RefusedError("assistant_calc_invalid", 422, {"operand": operand}) from error


def compute_calc(calc: PlanCalc, results: PlanResults, today: date) -> tuple[Any, str]:
    """
    Compute a difference, a ratio in percent or the days between two dates, in code rather than by the model.

    Args:
        calc (PlanCalc): The calc.
        results (PlanResults): Values computed so far.
        today (date): Today in Morocco.

    Returns:
        tuple[Any, str]: Value and kind (None when it cannot be computed, as a division by zero).

    Raises:
        RefusedError: assistant_calc_invalid (422).
    """
    left, left_kind = read_operand(calc.left, results)
    right, _ = read_operand(calc.right, results)
    left = today if calc.left == "today" else left
    right = today if calc.right == "today" else right
    if calc.op == CalcOperator.DAYS_BETWEEN:
        if not isinstance(left, date) or not isinstance(right, date):
            return None, FieldKind.DAYS
        return (right - left).days, FieldKind.DAYS
    if isinstance(left, date) or isinstance(right, date) or left is None or right is None:
        raise RefusedError("assistant_calc_invalid", 422, {"calc": calc.id})
    left_number, right_number = Decimal(str(left)), Decimal(str(right))
    if calc.op == CalcOperator.DIFFERENCE:
        return left_number - right_number, left_kind
    return (round(left_number / right_number * 100, 1) if right_number else None), FieldKind.NUMBER


def run_plan(plan: AssistantPlan, scope: QueryScope, context: PeriodContext, read_rows: RowReader) -> PlanResults:
    """
    Run a plan's queries in order (references filled from earlier ones, comparisons merged), then its calcs; stop early when a named record is missing or ambiguous.

    Args:
        plan (AssistantPlan): Normalized plan.
        scope (QueryScope): The asker's Sites and money visibility.
        context (PeriodContext): Today and the Season starts.
        read_rows (RowReader): Runs one compiled SELECT read-only.

    Returns:
        PlanResults: Rows per query, calc values, or why it stopped.
    """
    results = PlanResults()
    for planned in plan.queries:
        query = resolve_references(planned, results)
        if query is None:
            compiled = compile_query(planned.model_copy(update={"filters": [item for item in planned.filters if not REFERENCE_PATTERN.match(item.value)]}), scope)
            results.queries[planned.id] = (compiled, [])
            continue
        compiled = compile_query(query, scope)
        rows = read_rows(compiled.sql, compiled.params)
        if query.expects_one_record and not rows:
            results.stop_reason = "missing"
            return results
        if query.expects_one_record and not compiled.is_aggregate and len({row["_id"] for row in rows}) > 1:
            results.stop_reason, results.stop_query = "clarify", (compiled, rows)
            return results
        if query.compare:
            previous = compile_query(shift_query(query, context), scope)
            compiled, rows = merge_comparison(query, compiled, rows, read_rows(previous.sql, previous.params))
        results.queries[planned.id] = (compiled, rows)
    for calc in plan.calcs:
        results.calcs[calc.id] = compute_calc(calc, results, context.today)
    return results


def describe_rows(results: PlanResults, query_ids: list[str], row_cap: int, column_cap: int, text_cap: int) -> str:
    """
    Digest a few results for the model's second round: a handful of rows and columns, text cut short, never whole tables.

    Args:
        results (PlanResults): Results of round one.
        query_ids (list[str]): Queries the plan asked to see.
        row_cap (int): Rows per query.
        column_cap (int): Columns per query.
        text_cap (int): Characters per text cell.

    Returns:
        str: Compact lines for the prompt.
    """
    lines = []
    for query_id in query_ids:
        compiled, rows = results.queries.get(query_id, (None, []))
        if compiled is None:
            continue
        names = [name for name, _ in compiled.columns][:column_cap]
        lines.append(f"{query_id} ({len(rows)} rows{', truncated' if len(rows) > compiled.row_limit else ''}): " + " | ".join(names))
        for row in rows[:row_cap]:
            lines.append("  " + " | ".join(str(row.get(name))[:text_cap] for name in names))
    return "\n".join(lines)
