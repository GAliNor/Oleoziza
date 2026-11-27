import { mockResolve } from 'global/services/mock';
import { createId } from 'global/composables/crypto';
import { MOCK_ANSWERS, MOCK_TRANSCRIPT } from 'assistant/constants/mock-answers';
import type { IAnswerChoice, IAskPayload, IAssistantEvent, IAssistantQuestion, IAssistantService, IConversation, IConversationPage } from 'assistant/types/assistant';

const STAGE_DELAY_MS = 650;
const WORD_DELAY_MS = 45;
const CHUNK_WORDS = 3;

const conversations: IConversation[] = [];

const findQuestion = (questionId: string): IAssistantQuestion | undefined => conversations.flatMap((conversation) => conversation.questions).find((question) => question.id === questionId);

const pickAnswer = (text: string): (typeof MOCK_ANSWERS)[number] => {
  const lower = text.toLowerCase();
  return MOCK_ANSWERS.find((item) => item.keywords.some((keyword) => lower.includes(keyword))) ?? MOCK_ANSWERS[MOCK_ANSWERS.length - 1];
};

const wait = (milliseconds: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });

/** Plays the answer as the worker would: stages, planned blocks, the message a few words at a time, each block, then done. */
export default class AssistantMockService implements IAssistantService {
  ask(payload: IAskPayload): Promise<IAssistantQuestion> {
    let conversation = conversations.find((item) => item.id === payload.conversationId);
    if (!conversation) {
      conversation = { id: createId(), title: payload.text.slice(0, 120), questions: [] };
      conversations.unshift(conversation);
    }
    const question: IAssistantQuestion = { id: payload.requestId, conversationId: conversation.id, text: payload.text, status: 'pending', answer: null, errorCode: null, rating: null, createdAt: new Date().toISOString(), streamCursor: '0-1' };
    conversation.questions.push(question);
    return mockResolve(question);
  }

  choose(questionId: string, _choice: IAnswerChoice): Promise<IAssistantQuestion> {
    return this.retry(questionId);
  }

  retry(questionId: string): Promise<IAssistantQuestion> {
    const question = findQuestion(questionId);
    if (!question) return Promise.reject(new Error('assistant_question_not_found'));
    Object.assign(question, { status: 'pending', answer: null, errorCode: null, streamCursor: `0-${Date.now()}` });
    return mockResolve(question);
  }

  rate(questionId: string, rating: number): Promise<IAssistantQuestion> {
    const question = findQuestion(questionId);
    if (!question) return Promise.reject(new Error('assistant_question_not_found'));
    question.rating = rating || null;
    return mockResolve(question);
  }

  listConversations(offset: number, limit: number): Promise<IConversationPage> {
    return mockResolve({ items: conversations.slice(offset, offset + limit).map(({ id, title, questions }) => ({ id, title, updatedAt: questions.at(-1)?.createdAt ?? new Date().toISOString() })), total: conversations.length });
  }

  getConversation(conversationId: string): Promise<IConversation> {
    const conversation = conversations.find((item) => item.id === conversationId);
    return conversation ? mockResolve(conversation) : Promise.reject(new Error('assistant_conversation_not_found'));
  }

  deleteConversation(conversationId: string): Promise<void> {
    conversations.splice(conversations.findIndex((item) => item.id === conversationId), 1);
    return mockResolve(undefined);
  }

  clearConversations(): Promise<void> {
    conversations.length = 0;
    return mockResolve(undefined);
  }

  transcribe(): Promise<string> {
    return mockResolve(MOCK_TRANSCRIPT);
  }

  async streamEvents(questionId: string, _lastEventId: string | null, onEvent: (event: IAssistantEvent) => boolean | void, signal: AbortSignal): Promise<boolean> {
    const question = findQuestion(questionId);
    if (!question) return false;
    const { answer, entities } = pickAnswer(question.text);
    const attemptCursor = question.streamCursor;
    let sequence = 0;
    const emit = (event: string, data: Record<string, unknown>): void => {
      sequence += 1;
      onEvent({ id: `${attemptCursor}-${sequence}`, event, data: { ...data, attemptCursor } });
    };
    emit('stage', { stage: 'understanding' });
    await wait(STAGE_DELAY_MS * 1.6, signal);
    emit('plan', { blocks: answer.blocks.map((block) => ({ type: block.type, title: block.title })) });
    emit('stage', { stage: 'searching', entities });
    await wait(STAGE_DELAY_MS, signal);
    emit('stage', { stage: 'writing' });
    const words = answer.message.match(/\S+\s*/g) ?? [];
    for (let index = 0; index < words.length && !signal.aborted; index += CHUNK_WORDS) {
      emit('message.delta', { text: words.slice(index, index + CHUNK_WORDS).join('') });
      await wait(WORD_DELAY_MS, signal);
    }
    for (const block of answer.blocks) {
      await wait(STAGE_DELAY_MS / 3, signal);
      emit('block', block as unknown as Record<string, unknown>);
    }
    if (signal.aborted) return false;
    Object.assign(question, { status: 'answered', answer: { ...answer, scope: { siteNames: ['Oujda'], period: 'season' }, computedAt: new Date().toISOString() } });
    emit('done', { question: structuredClone(question) });
    return true;
  }
}
