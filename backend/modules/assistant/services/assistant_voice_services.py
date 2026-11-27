from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.security import get_current_manager
from core.types import CurrentUser
from modules.ai.services.ai_call_services import CallContext
from modules.ai.services.ai_transcription_services import AiTranscriptionService, AudioClip, get_ai_transcription_service
from modules.ai.types.ai_types import MAXIMUM_TRANSCRIPTION_SECONDS, AiFeature
from modules.assistant.types.assistant_types import MAXIMUM_RECORDING_BYTES, TRANSCRIPTION_RECORD_TYPE, TranscriptionOut
from modules.configuration.models.configuration_models import OliveVariety
from modules.site.models.site_models import Site


AUDIO_TYPES = frozenset({"audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/x-m4a", "audio/aac"})

MAXIMUM_VOCABULARY_LENGTH = 800

MILL_VOCABULARY = (
    "Questions d'un gérant d'huilerie, en français, arabe ou darija. Vocabulaire : lot, trituration, malaxeur, cuve, rendement, "
    "litres, quintal, CA, chiffre d'affaires, encaissé, impayés, remise, avoir, charges, saison, client, retrait, stockage"
)


class AssistantVoiceService:
    def __init__(self, db: Session, transcription_service: AiTranscriptionService, current_user: CurrentUser) -> None:
        """
        Turn a dictated question into text the Management User checks before sending.

        Args:
            db (Session): Session the vocabulary is read with.
            transcription_service (AiTranscriptionService): Runs the transcription within the AI Budget.
            current_user (CurrentUser): The signed-in Management User.
        """
        self.db = db
        self.transcription_service = transcription_service
        self.current_user = current_user

    def transcribe(self, audio: bytes, file_name: str, content_type: str, duration_in_seconds: float) -> TranscriptionOut:
        """
        Transcribe one recording of at most a minute, helped by the mill's vocabulary and its Site and variety names.

        Args:
            audio (bytes): Recording.
            file_name (str): Its file name.
            content_type (str): Its type, such as audio/webm;codecs=opus.
            duration_in_seconds (float): Its length.

        Returns:
            TranscriptionOut: The transcript.

        Raises:
            RefusedError: assistant_audio_invalid (422) for an empty, too long, too large or unknown recording, or the AI module's refusals.
        """
        media_type = content_type.split(";")[0].strip().lower()
        is_valid = bool(audio) and len(audio) <= MAXIMUM_RECORDING_BYTES and media_type in AUDIO_TYPES and 0 < duration_in_seconds <= MAXIMUM_TRANSCRIPTION_SECONDS + 1
        if not is_valid:
            raise RefusedError("assistant_audio_invalid", 422)
        context = CallContext(feature=AiFeature.ASSISTANT_TRANSCRIPTION, user_id=self.current_user.id, record_type=TRANSCRIPTION_RECORD_TYPE, record_id=None)
        clip = AudioClip(audio, file_name or "question.webm", media_type, duration_in_seconds, self._build_vocabulary())
        return TranscriptionOut(text=self.transcription_service.run_transcription(context, clip).text)

    def _build_vocabulary(self) -> str:
        """
        Describe the mill's words and names, so the transcription spells them as the app does.

        Returns:
            str: A short prompt, bounded in length.
        """
        names = [*self.db.scalars(select(Site.name)), *self.db.scalars(select(OliveVariety.name))]
        return f"{MILL_VOCABULARY}, {', '.join(dict.fromkeys(names))}"[:MAXIMUM_VOCABULARY_LENGTH]


def get_assistant_voice_service(
    db: Session = Depends(get_db),
    transcription_service: AiTranscriptionService = Depends(get_ai_transcription_service),
    current_user: CurrentUser = Depends(get_current_manager),
) -> AssistantVoiceService:
    """
    Build the dictation service for one request, bound to the signed-in Management User.

    Args:
        db (Session): Request session.
        transcription_service (AiTranscriptionService): AI transcription service.
        current_user (CurrentUser): Signed-in Management User.

    Returns:
        AssistantVoiceService: The service.
    """
    return AssistantVoiceService(db, transcription_service, current_user)
