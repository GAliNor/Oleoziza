import json
from pathlib import Path
from typing import Any

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from modules.assistant.business.plan_rules import normalize_plan
from modules.assistant.business.plan_runner import run_plan
from modules.assistant.business.query_compiler import QueryScope
from modules.assistant.helpers.answer_rendering import fill_message
from modules.assistant.types.assistant_types import PLAN_LANGUAGES, AnswerKind, AssistantPlan
from tests.modules.assistant.assistant_test_data import build_mill
from tests.modules.assistant.test_assistant_plans import CONTEXT


CORPUS = json.loads((Path(__file__).parent / "fixtures" / "question-corpus.json").read_text())


def test_the_corpus_covers_every_language_and_kind() -> None:
    """
    The synthetic set asks in French, Arabic and both Darija scripts, and includes off-topic and clarify questions.
    """
    assert len(CORPUS) >= 36
    assert {item["language"] for item in CORPUS} == set(PLAN_LANGUAGES)
    assert {item["plan"]["kind"] for item in CORPUS} == {kind.value for kind in AnswerKind}


@pytest.mark.parametrize("item", CORPUS, ids=[f"{index:02d}-{item['topic']}" for index, item in enumerate(CORPUS)])
def test_every_expected_plan_runs(db: Session, item: dict[str, Any]) -> None:
    """
    Every expected plan validates, compiles and runs on the mill fixture within the Site's scope, and its message fills without a gap.
    """
    mill = build_mill(db)
    plan = normalize_plan(AssistantPlan.model_validate(item["plan"]), CONTEXT, "season")

    results = run_plan(plan, QueryScope(site_ids=[mill.site.id], can_see_money=True), CONTEXT, lambda sql, params: [dict(row) for row in db.execute(text(sql), params).mappings()])

    assert results.stop_reason is None
    assert "{" not in fill_message(plan.message, results, plan.language)
