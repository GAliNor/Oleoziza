import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { formatAnswerValue, labelColumn } from 'assistant/composables/answer-format';
import { parseAssistantEvent, readEventStream } from 'assistant/composables/event-stream';
import { useAssistantStore } from 'assistant/stores/assistant';
import type { IAssistantEvent, IAssistantQuestion } from 'assistant/types/assistant';

const QUESTION: IAssistantQuestion = { id: 'q-1', conversationId: 'c-1', text: 'CA ?', status: 'pending', answer: null, errorCode: null, rating: null, createdAt: '2026-11-27T10:00:00Z', streamCursor: '1-0' };

const event = (name: string, data: Record<string, unknown>, id = ''): IAssistantEvent => ({ id, event: name, data: { attemptCursor: '1-0', ...data } });

describe('assistant event stream', () => {
  it('parses an event block and ignores a ping', () => {
    expect(parseAssistantEvent('id: 5-0\nevent: stage\ndata: {"stage":"searching"}')).toEqual({ id: '5-0', event: 'stage', data: { stage: 'searching' } });
    expect(parseAssistantEvent(': ping')).toBeNull();
  });

  it('reads events across chunk boundaries and stops at done', async () => {
    const encoder = new TextEncoder();
    const parts = ['id: 1\nevent: message.delta\ndata: {"text":"Le "}\n\nid: 2\nevent: message.de', 'lta\ndata: {"text":"CA"}\n\nid: 3\nevent: done\ndata: {}\n\nid: 4\nevent: stage\ndata: {}\n\n'];
    const body = new ReadableStream<BufferSource>({ start: (controller) => { parts.forEach((part) => controller.enqueue(encoder.encode(part))); controller.close(); } });
    const seen: string[] = [];

    const isFinished = await readEventStream(body, (item) => { seen.push(item.event); });

    expect(isFinished).toBe(true);
    expect(seen).toEqual(['message.delta', 'message.delta', 'done']);
  });
});

describe('assistant store events', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const startedStore = (): ReturnType<typeof useAssistantStore> => {
    const store = useAssistantStore();
    store.questions = [{ ...QUESTION }];
    store.streamed[QUESTION.id] = { stage: 'queued', entities: [], message: '', plannedBlocks: [], blocks: [], choices: [], lastEventId: '1-0', startedAt: 0, isDisconnected: false };
    return store;
  };

  it('builds the answer word by word with its planned blocks, then keeps the saved question', () => {
    const store = startedStore();

    store.applyEvent(QUESTION, event('stage', { stage: 'searching', entities: ['lot'] }, '2'));
    store.applyEvent(QUESTION, event('plan', { blocks: [{ type: 'number', title: 'CA' }] }, '3'));
    store.applyEvent(QUESTION, event('message.delta', { text: 'Le CA ' }, '4'));
    store.applyEvent(QUESTION, event('message.delta', { text: 'est de 2 450 DH.' }, '5'));

    expect(store.streamed[QUESTION.id]).toMatchObject({ stage: 'receiving', entities: ['lot'], message: 'Le CA est de 2 450 DH.', lastEventId: '5' });
    expect(store.streamed[QUESTION.id].plannedBlocks).toHaveLength(1);

    store.applyEvent(QUESTION, event('done', { question: { ...QUESTION, status: 'answered' } }, '6'));

    expect(store.streamed[QUESTION.id]).toBeUndefined();
    expect(store.questions[0].status).toBe('answered');
  });

  it('refuses events of a superseded attempt', () => {
    const store = startedStore();

    const isAccepted = store.applyEvent(QUESTION, { id: '9', event: 'message.delta', data: { text: 'old', attemptCursor: '0-1' } });

    expect(isAccepted).toBe(false);
    expect(store.streamed[QUESTION.id].message).toBe('');
  });

  it('fails the question on an error event with its code', () => {
    const store = startedStore();

    store.applyEvent(QUESTION, event('error', { code: 'ai_budget_exceeded' }));

    expect(store.questions[0]).toMatchObject({ status: 'failed', errorCode: 'ai_budget_exceeded' });
  });
});

describe('answer values', () => {
  it('writes values the way the app does', () => {
    expect(formatAnswerValue(2450, 'amount', 'revenue')).toMatch(/2\s450\sDH/);
    expect(formatAnswerValue(12.5, 'number', 'revenue_change_pct')).toBe('+12,5 %');
    expect(formatAnswerValue(null, 'amount')).toBe('—');
    expect(formatAnswerValue('service_milling', 'enum')).toBe('Trituration à façon');
  });

  it('labels columns from the module wording, comparison columns included', () => {
    expect(labelColumn('outstanding')).toBe('Reste à encaisser');
    expect(labelColumn('revenue_previous')).toBe('CA (avant)');
  });
});
