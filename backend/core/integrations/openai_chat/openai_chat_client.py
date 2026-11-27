import json
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import httpx

from core.config import get_settings
from core.exceptions import AiProviderError


@dataclass(frozen=True)
class ChatRequest:
    base_url: str
    api_key: str
    model: str
    system_prompt: str
    user_prompt: str
    schema_name: str
    json_schema: dict[str, Any]
    max_output_tokens: int
    extra_body: dict[str, Any]


@dataclass(frozen=True)
class ChatAnswer:
    content: dict[str, Any]
    input_tokens: int
    cached_input_tokens: int
    output_tokens: int
    reported_cost_usd: float | None
    duration_in_milliseconds: int
    raw: dict[str, Any]


class OpenAiChatClient:
    def __init__(self, timeout_in_seconds: float) -> None:
        """
        Call any OpenAI-compatible Chat Completions API (OpenAI, or a provider exposing the same shape at its own base URL).

        Args:
            timeout_in_seconds (float): Whole-request timeout.
        """
        self._timeout_in_seconds = timeout_in_seconds

    def complete_json(self, request: ChatRequest) -> ChatAnswer:
        """
        Ask for one answer that follows a strict JSON Schema and return it parsed, with its token usage.

        Args:
            request (ChatRequest): Endpoint, key, model, prompts and schema.

        Returns:
            ChatAnswer: Parsed JSON answer, token counts, the provider's own cost when it reports one, and the duration.

        Raises:
            AiProviderError: When the provider is unreachable, times out, refuses, or answers something that is not the JSON asked for.
        """
        started_at = time.monotonic()
        body = {
            "model": request.model,
            "messages": [{"role": "system", "content": request.system_prompt}, {"role": "user", "content": request.user_prompt}],
            "response_format": {"type": "json_schema", "json_schema": {"name": request.schema_name, "strict": True, "schema": request.json_schema}},
            "max_completion_tokens": request.max_output_tokens,
            **request.extra_body,
        }
        payload = self._post(request.base_url, request.api_key, body)
        duration_in_milliseconds = int((time.monotonic() - started_at) * 1000)
        usage = payload.get("usage") or {}
        return ChatAnswer(
            content=self._parse_content(payload),
            input_tokens=int(usage.get("prompt_tokens") or 0),
            cached_input_tokens=int((usage.get("prompt_tokens_details") or {}).get("cached_tokens") or 0),
            output_tokens=int(usage.get("completion_tokens") or 0),
            reported_cost_usd=float(usage["cost"]) if isinstance(usage.get("cost"), (int, float)) else None,
            duration_in_milliseconds=duration_in_milliseconds,
            raw=payload,
        )

    def _post(self, base_url: str, api_key: str, body: dict[str, Any]) -> dict[str, Any]:
        """
        Send the request and turn transport and HTTP failures into provider errors.

        Args:
            base_url (str): API base URL, for example https://api.openai.com/v1.
            api_key (str): Provider key.
            body (dict[str, Any]): Chat Completions body.

        Returns:
            dict[str, Any]: Decoded JSON response.

        Raises:
            AiProviderError: On timeout, network failure, a rejected key or any other refusal.
        """
        url = f"{base_url.rstrip('/')}/chat/completions"
        try:
            response = httpx.post(url, json=body, headers={"Authorization": f"Bearer {api_key}"}, timeout=self._timeout_in_seconds)
        except httpx.TimeoutException as error:
            raise AiProviderError("ai_provider_timeout", str(error)) from error
        except httpx.HTTPError as error:
            raise AiProviderError("ai_provider_unreachable", str(error)) from error
        if response.status_code in (401, 403):
            raise AiProviderError("ai_provider_rejected_key", response.text[:500])
        if response.status_code >= 400:
            raise AiProviderError("ai_provider_refused", response.text[:500])
        try:
            return response.json()
        except ValueError as error:
            raise AiProviderError("ai_provider_bad_answer", response.text[:500]) from error

    def _parse_content(self, payload: dict[str, Any]) -> dict[str, Any]:
        """
        Read the first choice's message as JSON.

        Args:
            payload (dict[str, Any]): Decoded response.

        Returns:
            dict[str, Any]: The JSON object the model answered.

        Raises:
            AiProviderError: ai_provider_bad_answer when there is no choice, a refusal, a cut answer, or invalid JSON.
        """
        choices = payload.get("choices") or []
        if not choices:
            raise AiProviderError("ai_provider_bad_answer", "no choice")
        message = choices[0].get("message") or {}
        if message.get("refusal"):
            raise AiProviderError("ai_provider_bad_answer", str(message["refusal"]))
        if choices[0].get("finish_reason") == "length":
            raise AiProviderError("ai_provider_bad_answer", "answer cut at the output limit")
        try:
            content = json.loads(message.get("content") or "")
        except ValueError as error:
            raise AiProviderError("ai_provider_bad_answer", "answer is not JSON") from error
        if not isinstance(content, dict):
            raise AiProviderError("ai_provider_bad_answer", "answer is not a JSON object")
        return content


@lru_cache
def get_openai_chat_client() -> OpenAiChatClient:
    """
    Build the chat client once from the settings.

    Returns:
        OpenAiChatClient: Cached client.
    """
    return OpenAiChatClient(get_settings().AI_REQUEST_TIMEOUT_IN_SECONDS)
