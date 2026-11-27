import BaseService, { isMockModule } from 'global/services/base';
import { getAccessToken, refreshAccessToken } from 'global/services/access-token';
import AssistantMockService from 'assistant/services/assistant.mock';
import { readEventStream } from 'assistant/composables/event-stream';
import type { IAnswerChoice, IAskPayload, IAssistantEvent, IAssistantQuestion, IAssistantService, IConversation, IConversationPage } from 'assistant/types/assistant';

class AssistantApiService extends BaseService implements IAssistantService {
  private _BASE_API_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/assistant`;

  ask(payload: IAskPayload, signal?: AbortSignal): Promise<IAssistantQuestion> {
    return this.request({ method: 'POST', url: `${this._BASE_API_URL}/questions`, data: payload, signal });
  }

  choose(questionId: string, choice: IAnswerChoice, signal?: AbortSignal): Promise<IAssistantQuestion> {
    return this.request({ method: 'POST', url: `${this._BASE_API_URL}/questions/${questionId}/choice`, data: { entity: choice.entity, recordId: choice.recordId }, signal });
  }

  retry(questionId: string, signal?: AbortSignal): Promise<IAssistantQuestion> {
    return this.request({ method: 'POST', url: `${this._BASE_API_URL}/questions/${questionId}/retry`, signal });
  }

  rate(questionId: string, rating: number): Promise<IAssistantQuestion> {
    return this.request({ method: 'PUT', url: `${this._BASE_API_URL}/questions/${questionId}/feedback`, data: { rating } });
  }

  listConversations(offset: number, limit: number, signal?: AbortSignal): Promise<IConversationPage> {
    return this.request({ method: 'GET', url: `${this._BASE_API_URL}/conversations`, params: { offset, limit }, signal });
  }

  getConversation(conversationId: string, signal?: AbortSignal): Promise<IConversation> {
    return this.request({ method: 'GET', url: `${this._BASE_API_URL}/conversations/${conversationId}`, signal });
  }

  deleteConversation(conversationId: string): Promise<void> {
    return this.request({ method: 'DELETE', url: `${this._BASE_API_URL}/conversations/${conversationId}` });
  }

  clearConversations(): Promise<void> {
    return this.request({ method: 'DELETE', url: `${this._BASE_API_URL}/conversations` });
  }

  async transcribe(audio: Blob, durationInSeconds: number): Promise<string> {
    const form = new FormData();
    form.append('audio', audio, audio.type.includes('mp4') ? 'question.mp4' : 'question.webm');
    form.append('durationInSeconds', String(durationInSeconds));
    const answer = await this.request<{ text: string }>({ method: 'POST', url: `${this._BASE_API_URL}/transcriptions`, data: form });
    return answer.text;
  }

  /** Server-sent events over fetch, so the Bearer token rides along; a 401 refreshes the token once. */
  async streamEvents(questionId: string, lastEventId: string | null, onEvent: (event: IAssistantEvent) => boolean | void, signal: AbortSignal): Promise<boolean> {
    const open = (): Promise<Response> =>
      fetch(`${this._BASE_API_URL}/questions/${questionId}/events`, {
        headers: { Accept: 'text/event-stream', Authorization: `Bearer ${getAccessToken() ?? ''}`, ...(lastEventId ? { 'Last-Event-ID': lastEventId } : {}) },
        signal,
      });
    let response = await open();
    if (response.status === 401) {
      await refreshAccessToken();
      if (signal.aborted) return false;
      response = await open();
    }
    if (!response.ok || !response.body) throw new Error(`assistant_stream_${response.status}`);
    return readEventStream(response.body, onEvent);
  }
}

export default isMockModule('assistant') ? AssistantMockService : AssistantApiService;
