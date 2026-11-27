import json
from datetime import date
from typing import Any

from modules.assistant.business.semantic_layer import ENTITIES, describe_semantic_layer
from modules.assistant.types.assistant_types import CALC_IDS, MAXIMUM_SUGGESTIONS, PLAN_LANGUAGES, PLAN_PERIODS, QUERY_IDS, AnswerKind, BlockType, CalcOperator, FilterOperator


PLAYBOOK_VERSION = "oleoziza-assistant-v2"

MAXIMUM_OUTPUT_TOKENS = 1400

SYSTEM_PROMPT = f"""You are the read-only Assistant of an olive oil mill (Olivor). Management asks about Lots, Clients, oil, money and Expenses.
Return one JSON plan; the app runs it and fills your message. You never see rows unless you ask for a second round.
Rules:
1. Language: reply in the asker's language: fr, ar (Modern Standard Arabic) or Darija (darija_latin or darija_arabic, same script as asked). Titles too.
2. Outside the mill's business: kind off_topic, one kind sentence, no queries. A business question you cannot express with the catalogue: kind clarify, one plain sentence saying what you cannot see yet (never the words catalogue, plan, query, field, entity or JSON), no queries, and put the closest answerable questions in suggestions. Never invent a formula.
3. Queries (q1..q4) use declared names only. fields group results when measures exist; without measures they list records. Code owns every formula and default: Revenue (CA, chiffre d'affaires, turnover) = lot.revenue; what a Client spends = lot.revenue for that Client; olives the mill bought = lot.purchase_amount; Result = lot.revenue − expense.operating_amount with expense payment_state=paid.
4. Period: omit it to use the Home's period. Use period for named periods (season = this Season, previous_season = the one before, all_time for current state or whole history). Explicit dates go in filters (YYYY-MM-DD) on the entity's date field. Stock (storage, tank) is current state: no period.
5. Filters are AND. value is a string; in takes comma-separated values; matches for names (Client, supplier); exact listed values for enums. Measures may be filtered after grouping.
6. A named Client: first query client with a matches filter on name and expects_one_record true, then use its id in later queries as {{q1.id}} in a client_id filter. A value from an earlier query goes in a filter as {{qN.column}}.
7. compare previous_period or previous_season on a query with measures adds <measure>_previous and <measure>_change_pct columns.
8. calcs (c1..c2): difference, ratio (left ÷ right × 100, a percent) or days_between (dates, right − left) over {{qN.column}} of single-row queries, {{c1.value}}, today, a date or a number. Use calcs for any arithmetic; never compute numbers yourself.
9. Use "days_*" fields for days remaining or waiting (days_until_planned_end, days_until_planned_start, days_waiting, days_until_due).
10. next: only when the kind of the next query depends on what an earlier one finds. Set next.sees to those query ids, leave message and blocks empty; you will get a short digest and write the final plan. Otherwise next is null.
11. message: 1–2 short sentences with placeholders {{q1.column}} (single-row aggregate), {{q1.rows}} (rows shown) or {{c1.value}}. Values arrive formatted with their unit (DH, kg, L): never write a unit or currency next to a placeholder. Wording must stay true for empty results.
12. blocks: number (one value; query or calc), table (records or groups), bar_chart (one measure by a label), cards (records without measures: Lots, Clients, Storages). Titles are short.
13. Fields marked money need the finance right; the prompt says when the asker lacks it, then answer without money.
14. suggestions: 0 to 3 short follow-up questions this catalogue can answer, in the asker's language and voice, that dig into or extend this answer (a breakdown, a comparison, a named Client or period). Never repeat the question; empty while next is set.
Catalogue:
{describe_semantic_layer()}
"""

NULLABLE_STRING = {"type": ["string", "null"]}

QUERY_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["id", "entity", "fields", "measures", "filters", "order_by", "limit", "expects_one_record", "period", "date_field", "compare"],
    "properties": {
        "id": {"type": "string", "enum": list(QUERY_IDS)},
        "entity": {"type": "string", "enum": list(ENTITIES)},
        "fields": {"type": "array", "maxItems": 12, "items": {"type": "string"}},
        "measures": {"type": "array", "maxItems": 8, "items": {"type": "string"}},
        "filters": {
            "type": "array",
            "maxItems": 12,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["field", "op", "value"],
                "properties": {"field": {"type": "string"}, "op": {"type": "string", "enum": [item.value for item in FilterOperator]}, "value": {"type": "string"}},
            },
        },
        "order_by": {
            "anyOf": [
                {"type": "null"},
                {"type": "object", "additionalProperties": False, "required": ["field", "direction"], "properties": {"field": {"type": "string"}, "direction": {"type": "string", "enum": ["asc", "desc"]}}},
            ]
        },
        "limit": {"type": "integer", "minimum": 1, "maximum": 50},
        "expects_one_record": {"type": "boolean"},
        "period": {"type": ["string", "null"], "enum": [*PLAN_PERIODS, None]},
        "date_field": NULLABLE_STRING,
        "compare": {"type": ["string", "null"], "enum": ["previous_period", "previous_season", None]},
    },
}

PLAN_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["kind", "language", "message", "queries", "calcs", "blocks", "next", "suggestions"],
    "properties": {
        "kind": {"type": "string", "enum": [item.value for item in AnswerKind]},
        "language": {"type": "string", "enum": list(PLAN_LANGUAGES)},
        "message": {"type": "string"},
        "queries": {"type": "array", "maxItems": 4, "items": QUERY_SCHEMA},
        "calcs": {
            "type": "array",
            "maxItems": 2,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["id", "op", "left", "right"],
                "properties": {"id": {"type": "string", "enum": list(CALC_IDS)}, "op": {"type": "string", "enum": [item.value for item in CalcOperator]}, "left": {"type": "string"}, "right": {"type": "string"}},
            },
        },
        "blocks": {
            "type": "array",
            "maxItems": 6,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["type", "query_id", "title", "label_field", "value_field"],
                "properties": {
                    "type": {"type": "string", "enum": [item.value for item in BlockType]},
                    "query_id": {"type": "string", "enum": [*QUERY_IDS, *CALC_IDS]},
                    "title": {"type": "string"},
                    "label_field": NULLABLE_STRING,
                    "value_field": NULLABLE_STRING,
                },
            },
        },
        "suggestions": {"type": "array", "maxItems": MAXIMUM_SUGGESTIONS, "items": {"type": "string"}},
        "next": {
            "anyOf": [
                {"type": "null"},
                {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["sees", "why"],
                    "properties": {"sees": {"type": "array", "minItems": 1, "maxItems": 4, "items": {"type": "string", "enum": list(QUERY_IDS)}}, "why": {"type": "string"}},
                },
            ]
        },
    },
}


def build_user_prompt(question: str, history: list[tuple[str, dict[str, Any] | None]], today: date, scope_line: str) -> str:
    """
    Build the short, changing tail of the prompt: today, the scope, the last questions with their queries (never rows), and the question.

    Args:
        question (str): The new question.
        history (list[tuple[str, dict[str, Any] | None]]): Earlier questions of the Conversation and their queries, oldest first.
        today (date): Today in Morocco.
        scope_line (str): Sites, Home period and whether money is visible.

    Returns:
        str: The user prompt.
    """
    lines = [f"Today: {today.isoformat()}", f"Scope: {scope_line}"]
    if history:
        lines.append("Earlier in this conversation (for follow-up questions):")
        for text, queries in history:
            lines.append(f"- Q: {text}")
            if queries:
                lines.append(f"  queries: {json.dumps(queries, ensure_ascii=False, separators=(',', ':'))}")
    lines.append(f"Question: {question}")
    return "\n".join(lines)


def build_second_round_note(digest: str, why: str) -> str:
    """
    Append what round one found, so the model writes the final plan.

    Args:
        digest (str): Compact rows of the queries it asked to see.
        why (str): Why it asked.

    Returns:
        str: Text appended to the user prompt.
    """
    return f"\nRound one results ({why}):\n{digest}\nNow write the final plan: copy values you need into filters, next must be null."
