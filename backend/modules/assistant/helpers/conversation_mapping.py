from uuid import UUID

from modules.assistant.models.assistant_models import AssistantQuestion
from modules.assistant.types.assistant_types import AnswerKind, AssistantAnswer, QuestionOut


MISSING_RECORD_MESSAGES = {
    "fr": "Je ne trouve aucune fiche à ce nom. Pouvez-vous préciser le nom ?",
    "ar": "لم أجد أي ملف بهذا الاسم. هل يمكنك توضيح الاسم؟",
    "darija_latin": "Ma l9it 7ta fiche b had smiya. 3afak wdda7 smiya aktar.",
    "darija_arabic": "ما لقيت حتى فيش بهاد السمية. عافاك وضّح السمية كثر.",
}

FINANCE_HIDDEN_MESSAGES = {
    "fr": "Cette question touche aux chiffres d'argent, que votre compte ne voit pas sur ces sites.",
    "ar": "هذا السؤال يخص الأرقام المالية، وحسابك لا يطلع عليها في هذه المواقع.",
    "darija_latin": "Had so2al fih l9lawi dyal lflous, w compte dyalk ma kaychofhomch f had les sites.",
    "darija_arabic": "هاد السؤال فيه أرقام ديال الفلوس، والحساب ديالك ما كيشوفهمش ف هاد المواقع.",
}


def build_stream_key(question_id: UUID) -> str:
    """
    Name a question's replayable event stream.

    Args:
        question_id (UUID): Question id.

    Returns:
        str: Redis stream key.
    """
    return f"assistant:events:{question_id}"


def build_owner_key(question_id: UUID) -> str:
    """
    Name the short-lived key that says who may read a question's stream.

    Args:
        question_id (UUID): Question id.

    Returns:
        str: Redis key.
    """
    return f"assistant:owner:{question_id}"


def build_notice_answer(language: str, messages: dict[str, str]) -> AssistantAnswer:
    """
    Answer with a fixed notice in the asker's language, without figures.

    Args:
        language (str): Plan language.
        messages (dict[str, str]): The notice per language.

    Returns:
        AssistantAnswer: A message-only answer.
    """
    return AssistantAnswer(kind=AnswerKind.ANSWER, message=messages.get(language, messages["fr"]))


def map_question(question: AssistantQuestion) -> QuestionOut:
    """
    Show a stored question with its answer snapshot and current stream cursor.

    Args:
        question (AssistantQuestion): Stored question.

    Returns:
        QuestionOut: The question as the front reads it.
    """
    return QuestionOut(
        id=question.id,
        conversation_id=question.conversation_id,
        text=question.text,
        status=question.status,
        answer=AssistantAnswer.model_validate(question.answer) if question.answer else None,
        error_code=question.error_code,
        rating=question.rating,
        created_at=question.created_at,
        stream_cursor=question.stream_cursor if question.stream_cursor and not question.stream_cursor.startswith("starting:") else None,
    )
