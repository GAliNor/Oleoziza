import re
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from modules.assistant.business.plan_rules import PLACEHOLDER_PATTERN
from modules.assistant.business.plan_runner import PlanResults
from modules.assistant.business.query_compiler import CompiledQuery
from modules.assistant.types.assistant_types import AnswerBlock, AnswerColumn, AnswerFact, AnswerRecord, PlannedBlock
from modules.assistant.types.semantic_types import NUMERIC_KINDS, FieldKind


ARABIC_SCRIPT_LANGUAGES = ("ar", "darija_arabic")

UNIT_BY_KIND = {
    FieldKind.AMOUNT: ("DH", "درهم"),
    FieldKind.LITRES: ("L", "لتر"),
    FieldKind.KILOGRAMS: ("kg", "كلغ"),
    FieldKind.DAYS: ("j", "يوم"),
}

CHUNK_WORDS = 3

HIDDEN_FACTS = {"id", "name", "code", "client_id"}


def to_json_value(value: Any) -> Any:
    """
    Turn a database value into a JSON-safe value.

    Args:
        value (Any): A cell.

    Returns:
        Any: A number, string, bool or None.
    """
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    return value


def format_number(number: float) -> str:
    """
    Write a number the Moroccan way (G12): a space for thousands, a comma for decimals, Western digits.

    Args:
        number (float): The number.

    Returns:
        str: Display text, such as 47 231,50.
    """
    text = f"{number:,.0f}" if number == int(number) else f"{number:,.2f}"
    return text.replace(",", " ").replace(".", ",")


def format_value(value: Any, kind: str, language: str) -> str:
    """
    Format a value for the chat message, with its unit in the asker's script.

    Args:
        value (Any): A cell.
        kind (str): Its field kind.
        language (str): Plan language.

    Returns:
        str: Display text.
    """
    if value is None:
        return "—"
    if isinstance(value, (int, float, Decimal)):
        text = format_number(float(value))
        units = UNIT_BY_KIND.get(FieldKind(kind)) if kind in FieldKind._value2member_map_ else None
        return f"{text} {units[1 if language in ARABIC_SCRIPT_LANGUAGES else 0]}" if units and kind != FieldKind.DAYS else text
    if isinstance(value, (date, datetime)):
        return value.strftime("%d/%m/%Y")
    return str(value)


def fill_message(template: str, results: PlanResults, language: str) -> str:
    """
    Fill the message's placeholders from query results and calcs.

    Args:
        template (str): Message with {q1.column}, {q1.rows} and {c1.value} placeholders.
        results (PlanResults): Rows per query and calc values.
        language (str): Plan language.

    Returns:
        str: The message to show.
    """

    def replace(match: re.Match[str]) -> str:
        source, column = match.group(1), match.group(2)
        if source in results.calcs:
            value, kind = results.calcs[source]
            return format_value(value, kind, language)
        if source not in results.queries:
            return "—"
        compiled, rows = results.queries[source]
        if column == "rows":
            return str(min(len(rows), compiled.row_limit))
        kinds = dict(compiled.columns)
        if not rows or column not in rows[0]:
            return format_value(0, kinds.get(column, FieldKind.NUMBER), language) if kinds.get(column) in NUMERIC_KINDS else "—"
        return format_value(rows[0][column], kinds.get(column, FieldKind.TEXT), language)

    return PLACEHOLDER_PATTERN.sub(replace, template)


def build_calc_block(planned: PlannedBlock, value: Any, kind: str) -> AnswerBlock:
    """
    Show one computed value as a number block.

    Args:
        planned (PlannedBlock): Block chosen by the plan.
        value (Any): The computed value.
        kind (str): Its kind.

    Returns:
        AnswerBlock: A one-row block.
    """
    return AnswerBlock(type=planned.type.value, title=planned.title, columns=[AnswerColumn(key="value", kind=str(kind))], rows=[{"value": to_json_value(value)}], value_field="value")


def build_block(planned: PlannedBlock, compiled: CompiledQuery, rows: list[dict[str, Any]]) -> AnswerBlock:
    """
    Build one answer block from a planned block and its query's rows; rows carry typed values the front formats.

    Args:
        planned (PlannedBlock): Block chosen by the plan.
        compiled (CompiledQuery): Its compiled query, for column kinds.
        rows (list[dict[str, Any]]): Its rows.

    Returns:
        AnswerBlock: Ready for the front.
    """
    columns = [AnswerColumn(key=key, kind=str(kind)) for key, kind in compiled.columns]
    keys = [key for key, _ in compiled.columns]
    value_field = planned.value_field if planned.value_field in keys else next((key for key, kind in compiled.columns if kind in NUMERIC_KINDS), None)
    label_field = planned.label_field if planned.label_field in keys else next((key for key, kind in compiled.columns if kind not in NUMERIC_KINDS), None)
    json_rows = [{key: to_json_value(value) for key, value in row.items()} for row in rows[:compiled.row_limit]]
    records = [] if compiled.is_aggregate else [
        AnswerRecord(
            id=str(row["_id"]),
            entity=compiled.entity.name,
            label=str(row["_label"]),
            link=row.get("_link"),
            facts=[AnswerFact(key=key, value=row.get(key), kind=str(kind)) for key, kind in compiled.columns if key not in HIDDEN_FACTS],
        )
        for row in json_rows
    ]
    return AnswerBlock(
        type=planned.type.value,
        title=planned.title,
        columns=columns,
        rows=json_rows,
        label_field=label_field,
        value_field=value_field,
        entity=compiled.entity.name,
        records=records,
        reporting=compiled.reporting,
        is_truncated=len(rows) > compiled.row_limit,
    )


def split_message(message: str) -> list[str]:
    """
    Cut a finished message into small word groups, so it appears word by word in the chat.

    Args:
        message (str): The filled message.

    Returns:
        list[str]: Chunks that join back to the message.
    """
    words = re.findall(r"\S+\s*", message)
    return ["".join(words[index:index + CHUNK_WORDS]) for index in range(0, len(words), CHUNK_WORDS)]
