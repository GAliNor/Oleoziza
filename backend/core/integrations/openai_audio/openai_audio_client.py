import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import httpx

from core.config import get_settings
from core.exceptions import AiProviderError


@dataclass(frozen=True)
class TranscriptionRequest:
    base_url: str
    api_key: str
    model: str
    audio: bytes
    file_name: str
    content_type: str
    prompt: str


@dataclass(frozen=True)
class TranscriptionAnswer:
    text: str
    input_tokens: int
    output_tokens: int
    duration_in_milliseconds: int


class OpenAiAudioClient:
    def __init__(self, timeout_in_seconds: float) -> None:
        """
        Keep the request timeout for OpenAI-compatible transcription calls.

        Args:
            timeout_in_seconds (float): Time allowed for one call.
        """
        self._timeout_in_seconds = timeout_in_seconds

    def transcribe(self, request: TranscriptionRequest) -> TranscriptionAnswer:
        """
        Send one recording to /audio/transcriptions and read back its text and token usage.

        Args:
            request (TranscriptionRequest): Recording, model and vocabulary prompt.

        Returns:
            TranscriptionAnswer: The transcript, its tokens when reported, and the call's duration.

        Raises:
            AiProviderError: On timeout, network failure, a rejected key, any other refusal, or an answer without text.
        """
        started = time.monotonic()
        url = f"{request.base_url.rstrip('/')}/audio/transcriptions"
        try:
            response = httpx.post(
                url,
                headers={"Authorization": f"Bearer {request.api_key}"},
                data={"model": request.model, "prompt": request.prompt, "response_format": "json"},
                files={"file": (request.file_name, request.audio, request.content_type)},
                timeout=self._timeout_in_seconds,
            )
        except httpx.TimeoutException as error:
            raise AiProviderError("ai_provider_timeout", str(error)) from error
        except httpx.HTTPError as error:
            raise AiProviderError("ai_provider_unreachable", str(error)) from error
        if response.status_code in (401, 403):
            raise AiProviderError("ai_provider_rejected_key", response.text[:500])
        if response.status_code >= 400:
            raise AiProviderError("ai_provider_refused", response.text[:500])
        try:
            payload: dict[str, Any] = response.json()
        except ValueError as error:
            raise AiProviderError("ai_provider_bad_answer", response.text[:500]) from error
        text = payload.get("text")
        if not isinstance(text, str):
            raise AiProviderError("ai_provider_bad_answer", "no transcript")
        usage = payload.get("usage") or {}
        return TranscriptionAnswer(
            text=text.strip(),
            input_tokens=int(usage.get("input_tokens") or 0),
            output_tokens=int(usage.get("output_tokens") or 0),
            duration_in_milliseconds=int((time.monotonic() - started) * 1000),
        )


@lru_cache
def get_openai_audio_client() -> OpenAiAudioClient:
    """
    Build the audio client once from the settings.

    Returns:
        OpenAiAudioClient: Cached client.
    """
    return OpenAiAudioClient(get_settings().AI_REQUEST_TIMEOUT_IN_SECONDS)
