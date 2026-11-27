from modules.assistant.types.assistant_types import (
    MAXIMUM_SUGGESTION_LENGTH,
    MAXIMUM_SUGGESTIONS,
    AnswerMethod,
    AnswerMethodCalc,
    AnswerMethodFilter,
    AnswerMethodQuery,
    AssistantPlan,
)


def build_answer_method(plan: AssistantPlan) -> AnswerMethod | None:
    """
    Describe what the final plan read and computed, in declared names only, so the front can say how an answer was calculated.

    Args:
        plan (AssistantPlan): The normalized final plan.

    Returns:
        AnswerMethod | None: Queries and calcs, or None when the plan read nothing.
    """
    if not plan.queries and not plan.calcs:
        return None
    queries = [
        AnswerMethodQuery(
            entity=query.entity,
            measures=list(query.measures),
            group_by=list(query.fields) if query.measures else [],
            filters=[AnswerMethodFilter(field=item.field, op=item.op, value=item.value) for item in query.filters],
            period=query.period,
            compare=query.compare,
        )
        for query in plan.queries
    ]
    calcs = [AnswerMethodCalc(op=calc.op, left=calc.left, right=calc.right) for calc in plan.calcs]
    return AnswerMethod(queries=queries, calcs=calcs)


def clean_suggestions(suggestions: list[str], question: str) -> list[str]:
    """
    Keep distinct, short follow-up questions that differ from the one just asked.

    Args:
        suggestions (list[str]): The model's follow-up questions.
        question (str): The question just answered.

    Returns:
        list[str]: At most three cleaned suggestions.
    """
    asked = question.strip().casefold()
    kept: list[str] = []
    for suggestion in suggestions:
        text = " ".join(suggestion.split())[:MAXIMUM_SUGGESTION_LENGTH]
        if text and text.casefold() != asked and text.casefold() not in (item.casefold() for item in kept):
            kept.append(text)
    return kept[:MAXIMUM_SUGGESTIONS]
