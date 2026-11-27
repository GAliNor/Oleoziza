from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import AiProviderError, RefusedError
from core.integrations.fernet.fernet_client import SecretBox, get_secret_box
from core.integrations.openai_audio.openai_audio_client import OpenAiAudioClient, TranscriptionAnswer, TranscriptionRequest, get_openai_audio_client
from core.integrations.openai_chat.openai_chat_client import OpenAiChatClient, get_openai_chat_client
from modules.ai.business.ai_pricing import TokenUsage, compute_cost
from modules.ai.helpers.ai_mappers import build_call_prices
from modules.ai.models.ai_models import AiCall, AiCallPayload
from modules.ai.services.ai_call_services import AiCallService, CallContext
from modules.ai.types.ai_types import MAXIMUM_TRANSCRIPTION_SECONDS, TRANSCRIPTION_PRICE_PER_MINUTE_USD, AiCallStatus


@dataclass(frozen=True)
class AudioClip:
    audio: bytes
    file_name: str
    content_type: str
    duration_in_seconds: float
    vocabulary: str


@dataclass(frozen=True)
class TranscriptionResult:
    call_id: UUID
    text: str
    cost_usd: Decimal


def price_by_duration(duration_in_seconds: float) -> Decimal:
    """
    Price a recording by its length at the transcription model's per-minute rate, capped at the longest recording accepted.

    Args:
        duration_in_seconds (float): Recording length.

    Returns:
        Decimal: Cost in USD.
    """
    seconds = Decimal(str(min(max(duration_in_seconds, 1), MAXIMUM_TRANSCRIPTION_SECONDS)))
    return (TRANSCRIPTION_PRICE_PER_MINUTE_USD * seconds / 60).quantize(Decimal("0.000001"))


class AiTranscriptionService(AiCallService):
    def __init__(self, db: Session, secret_box: SecretBox, chat_client: OpenAiChatClient, audio_client: OpenAiAudioClient) -> None:
        """
        Run transcription calls for AI features with the same budget, key and ledger rules as every AI call.

        Args:
            db (Session): Database session; this service commits the ledger around the provider call.
            secret_box (SecretBox): Opens the provider keys.
            chat_client (OpenAiChatClient): Chat client of the parent service.
            audio_client (OpenAiAudioClient): Sends recordings to be transcribed.
        """
        super().__init__(db, secret_box, chat_client)
        self.audio_client = audio_client

    def run_transcription(self, context: CallContext, clip: AudioClip) -> TranscriptionResult:
        """
        Turn a recording into text with the AI feature's model, within the key's AI budget, on the ledger whatever happens.

        Args:
            context (CallContext): Which AI feature, for whom and for which record.
            clip (AudioClip): The recording, its length and the words it likely holds.

        Returns:
            TranscriptionResult: The transcript, its ledger id and cost.

        Raises:
            RefusedError: ai_feature_not_configured, ai_provider_key_missing, ai_budget_exceeded (409), or the provider's failure code (502).
        """
        model, provider = self._get_feature_model(context.feature)
        key = self._open_key(provider)
        call = self._reserve_estimate(context, model, provider.id, price_by_duration(MAXIMUM_TRANSCRIPTION_SECONDS))
        request = TranscriptionRequest(provider.base_url, key, model.name, clip.audio, clip.file_name, clip.content_type, clip.vocabulary)
        try:
            answer = self.audio_client.transcribe(request)
        except AiProviderError as error:
            self._record_failure(call, error)
            raise RefusedError(error.code, 502) from error
        cost = self._record_transcription(call, answer, clip)
        return TranscriptionResult(call_id=call.id, text=answer.text, cost_usd=cost)

    def _record_transcription(self, call: AiCall, answer: TranscriptionAnswer, clip: AudioClip) -> Decimal:
        """
        Close a reserved row with the transcription's cost (its tokens when the model is priced by token, else its length), and keep the
        transcript, never the audio, when the AI feature keeps payloads.

        Args:
            call (AiCall): Reserved row.
            answer (TranscriptionAnswer): The provider's answer.
            clip (AudioClip): What was sent.

        Returns:
            Decimal: The call's cost in USD.
        """
        usage = TokenUsage(answer.input_tokens, 0, answer.output_tokens)
        token_cost = compute_cost(build_call_prices(call), usage)
        cost = token_cost if token_cost > 0 else price_by_duration(clip.duration_in_seconds)
        call.status = AiCallStatus.SUCCEEDED
        call.input_tokens = answer.input_tokens
        call.output_tokens = answer.output_tokens
        call.cost_usd = cost
        call.duration_in_milliseconds = answer.duration_in_milliseconds
        call.finished_at = datetime.now(UTC)
        retention_days = self._get_retention_days(call.feature)
        if retention_days:
            request = {"contentType": clip.content_type, "seconds": clip.duration_in_seconds, "vocabulary": clip.vocabulary}
            self.db.add(AiCallPayload(call_id=call.id, request=request, response={"text": answer.text}, purge_after=date.today() + timedelta(days=retention_days)))
        self.db.commit()
        return cost


def get_ai_transcription_service(
    db: Session = Depends(get_db),
    secret_box: SecretBox = Depends(get_secret_box),
    chat_client: OpenAiChatClient = Depends(get_openai_chat_client),
    audio_client: OpenAiAudioClient = Depends(get_openai_audio_client),
) -> AiTranscriptionService:
    """
    Build the AI transcription service for a request.

    Args:
        db (Session): Request database session.
        secret_box (SecretBox): Key box.
        chat_client (OpenAiChatClient): Chat client.
        audio_client (OpenAiAudioClient): Audio client.

    Returns:
        AiTranscriptionService: Service bound to the session.
    """
    return AiTranscriptionService(db, secret_box, chat_client, audio_client)
