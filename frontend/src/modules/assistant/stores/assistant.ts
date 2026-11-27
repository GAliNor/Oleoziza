import { defineStore } from 'pinia';

import { cachedLoad, invalidateLoads, LOAD_TTL_MS } from 'global/composables/cached-load';
import { withStatus } from 'global/composables/with-status';
import { PAGE_SIZE } from 'global/constants/page';
import { readAnswerStream } from 'assistant/composables/answer-stream';
import AssistantService from 'assistant/services/assistant';
import type { ChatStage, IAnswerBlock, IAnswerChoice, IAskPayload, IAssistantEvent, IAssistantQuestion, IAssistantStore, IPlannedBlock, IRequestStatus, IStreamedAnswer } from 'assistant/types/assistant';

const assistantService = new AssistantService();

const TITLE_LENGTH = 120;
const controllers = new WeakMap<object, AbortController>();
const historyControllers = new WeakMap<object, AbortController>();

const requestStatus = (): IRequestStatus => ({ isLoading: false, hasError: false });

const freshStream = (cursor: string | null): IStreamedAnswer => ({ stage: 'queued', entities: [], message: '', plannedBlocks: [], blocks: [], choices: [], lastEventId: cursor, startedAt: Date.now(), isDisconnected: false });

export const useAssistantStore = defineStore('assistant', {
  state: (): IAssistantStore => ({
    conversationId: null,
    questions: [],
    streamed: {},
    conversations: [],
    conversationTotal: 0,
    hasHistoryLoaded: false,
    generation: 0,
    historyGeneration: 0,
    submitStatus: requestStatus(),
    openStatus: requestStatus(),
    historyStatus: requestStatus(),
    mutationStatus: requestStatus(),
    feedbackStatus: requestStatus(),
    streamStatus: requestStatus(),
    transcribeStatus: requestStatus(),
    transcribeErrorCode: null,
  }),
  getters: {
    isBusy: (state): boolean => state.submitStatus.isLoading || state.openStatus.isLoading || state.mutationStatus.isLoading || state.questions.some((question) => question.status === 'pending'),
  },
  actions: {
    /** Leaves the current thread; saved Conversations stay in the history. */
    newConversation(): void {
      controllers.get(this)?.abort();
      this.generation += 1;
      this.conversationId = null;
      this.questions = [];
      this.streamed = {};
      this.submitStatus = requestStatus();
      this.openStatus = requestStatus();
      this.feedbackStatus = requestStatus();
      this.streamStatus = requestStatus();
    },
    replaceQuestion(question: IAssistantQuestion): void {
      this.questions = this.questions.map((item) => (item.id === question.id ? question : item));
    },
    /**
     * Shows the question at once (its id is the client-minted `requestId`, which the backend keeps), then swaps in the saved one.
     * `requestId` is minted when the draft changes, so a retry after a lost response sends the same question id.
     */
    async submit(payload: Omit<IAskPayload, 'conversationId'>): Promise<boolean> {
      const text = payload.text.trim();
      if (!text || this.isBusy) return false;
      const generation = this.generation;
      const controller = new AbortController();
      controllers.set(this, controller);
      const conversationId = this.conversationId;
      this.questions.push({ id: payload.requestId, conversationId: conversationId ?? '', text, status: 'pending', answer: null, errorCode: null, rating: null, createdAt: new Date().toISOString(), streamCursor: null });
      const question = await withStatus(this.submitStatus, 'isLoading', () => assistantService.ask({ ...payload, text, conversationId }, controller.signal), { errorFlag: 'hasError' });
      if (generation !== this.generation || controller.signal.aborted) return false;
      if (!question) {
        this.questions = this.questions.filter((item) => item.id !== payload.requestId);
        return false;
      }
      const isNew = this.conversationId === null;
      this.conversationId = question.conversationId;
      this.questions = this.questions.some((item) => item.id === question.id) ? this.questions.map((item) => (item.id === question.id ? question : item)) : [...this.questions, question];
      this.touchHistory(question, isNew);
      void this.listen(question);
      return true;
    },
    /** Puts the asked Conversation first in the loaded history, without a refetch. */
    touchHistory(question: IAssistantQuestion, isNew: boolean): void {
      historyControllers.get(this)?.abort();
      this.historyGeneration += 1;
      this.historyStatus = requestStatus();
      const existing = this.conversations.find((item) => item.id === question.conversationId);
      if (isNew && this.hasHistoryLoaded && !existing) {
        this.conversations.unshift({ id: question.conversationId, title: question.text.slice(0, TITLE_LENGTH), updatedAt: question.createdAt });
        this.conversationTotal += 1;
      } else if (existing) {
        this.conversations = [{ ...existing, updatedAt: question.createdAt }, ...this.conversations.filter((item) => item.id !== existing.id)];
      }
      invalidateLoads('assistant:history:');
    },
    /** Applies one event of the current attempt; events of a superseded attempt are refused. */
    applyEvent(question: IAssistantQuestion, event: IAssistantEvent): boolean {
      if (event.data.attemptCursor !== undefined && event.data.attemptCursor !== (question.streamCursor ?? null)) return false;
      const state = this.streamed[question.id];
      if (!state) return false;
      state.lastEventId = event.id || state.lastEventId;
      state.isDisconnected = false;
      if (event.event === 'reset') {
        Object.assign(state, freshStream(state.lastEventId));
        this.replaceQuestion({ ...question, streamCursor: event.id || question.streamCursor, status: 'pending', answer: null, errorCode: null });
      } else if (event.event === 'stage') {
        state.stage = event.data.stage as ChatStage;
        if (Array.isArray(event.data.entities)) state.entities = event.data.entities as string[];
      } else if (event.event === 'plan') state.plannedBlocks = event.data.blocks as IPlannedBlock[];
      else if (event.event === 'message.delta') {
        state.stage = 'receiving';
        state.message += String(event.data.text ?? '');
      } else if (event.event === 'block') state.blocks.push(event.data as unknown as IAnswerBlock);
      else if (event.event === 'choices') state.choices = event.data.choices as IAnswerChoice[];
      else if (event.event === 'done') {
        this.replaceQuestion(event.data.question as IAssistantQuestion);
        delete this.streamed[question.id];
      } else if (event.event === 'error') {
        this.replaceQuestion({ ...question, status: 'failed', errorCode: String(event.data.code ?? '') });
        delete this.streamed[question.id];
      }
      return true;
    },
    async listen(question: IAssistantQuestion): Promise<void> {
      controllers.get(this)?.abort();
      const controller = new AbortController();
      controllers.set(this, controller);
      const generation = this.generation;
      const isCurrent = (): boolean => generation === this.generation && !controller.signal.aborted;
      this.streamed[question.id] ??= freshStream(question.streamCursor);
      await withStatus(
        this.streamStatus,
        'isLoading',
        async () => {
          const isFinished = await readAnswerStream(
            assistantService,
            question.id,
            () => this.streamed[question.id]?.lastEventId ?? question.streamCursor,
            (event) => (isCurrent() ? this.applyEvent(this.questions.find((item) => item.id === question.id) ?? question, event) : false),
            () => {
              if (isCurrent() && this.streamed[question.id]) this.streamed[question.id].stage = 'reconnecting';
            },
            () => this.recoverQuestion(question, controller.signal, generation),
            controller.signal,
          );
          if (isCurrent() && !isFinished && this.streamed[question.id]) this.streamed[question.id].isDisconnected = true;
        },
        { errorFlag: 'hasError' },
      );
    },
    /** After a dropped stream, the saved question tells whether the answer already landed. */
    async recoverQuestion(question: IAssistantQuestion, signal: AbortSignal, generation: number): Promise<boolean> {
      const conversation = await withStatus(this.streamStatus, 'isLoading', () => assistantService.getConversation(question.conversationId, signal));
      if (generation !== this.generation || signal.aborted) return false;
      const saved = conversation?.questions.find((item) => item.id === question.id);
      if (!saved) return false;
      if (saved.status === 'pending') {
        const current = this.questions.find((item) => item.id === question.id);
        if (saved.streamCursor !== (current?.streamCursor ?? null)) {
          this.replaceQuestion(saved);
          this.streamed[question.id] = freshStream(saved.streamCursor);
        }
        return false;
      }
      this.replaceQuestion(saved);
      delete this.streamed[question.id];
      return true;
    },
    async openConversation(id: string): Promise<boolean> {
      this.newConversation();
      const generation = this.generation;
      const controller = new AbortController();
      controllers.set(this, controller);
      const conversation = await withStatus(this.openStatus, 'isLoading', () => assistantService.getConversation(id, controller.signal), { errorFlag: 'hasError' });
      if (!conversation || generation !== this.generation || controller.signal.aborted) return false;
      this.conversationId = conversation.id;
      this.questions = conversation.questions;
      const pending = this.questions.find((question) => question.status === 'pending');
      if (pending) void this.listen(pending);
      return true;
    },
    async loadHistory(isMore = false): Promise<void> {
      if (this.historyStatus.isLoading) return;
      const offset = isMore ? this.conversations.length : 0;
      const generation = this.historyGeneration;
      const controller = new AbortController();
      historyControllers.set(this, controller);
      await cachedLoad(`assistant:history:${offset}`, LOAD_TTL_MS.live, async () => {
        const page = await withStatus(this.historyStatus, 'isLoading', () => assistantService.listConversations(offset, PAGE_SIZE, controller.signal), { errorFlag: 'hasError' });
        if (!page || generation !== this.historyGeneration) return false;
        this.conversations = isMore ? [...this.conversations, ...page.items.filter((item) => !this.conversations.some((existing) => existing.id === item.id))] : page.items;
        this.conversationTotal = page.total;
        this.hasHistoryLoaded = true;
        return true;
      });
    },
    async choose(question: IAssistantQuestion, choice: IAnswerChoice): Promise<void> {
      if (this.isBusy) return;
      await this.restart(question, (signal) => assistantService.choose(question.id, choice, signal));
    },
    async retry(question: IAssistantQuestion): Promise<void> {
      if (this.isBusy || question.status !== 'failed') return;
      await this.restart(question, (signal) => assistantService.retry(question.id, signal));
    },
    async restart(question: IAssistantQuestion, send: (signal: AbortSignal) => Promise<IAssistantQuestion>): Promise<void> {
      const generation = this.generation;
      const controller = new AbortController();
      controllers.set(this, controller);
      const updated = await withStatus(this.submitStatus, 'isLoading', () => send(controller.signal), { errorFlag: 'hasError' });
      if (!updated || generation !== this.generation || controller.signal.aborted) return;
      delete this.streamed[question.id];
      this.replaceQuestion(updated);
      void this.listen(updated);
    },
    async rate(question: IAssistantQuestion, rating: number): Promise<void> {
      if (this.feedbackStatus.isLoading) return;
      const generation = this.generation;
      const updated = await withStatus(this.feedbackStatus, 'isLoading', () => assistantService.rate(question.id, question.rating === rating ? 0 : rating), { errorFlag: 'hasError' });
      if (updated && generation === this.generation) this.replaceQuestion(updated);
    },
    /** Deletes one Conversation, or every one with null; the loaded list is patched, not refetched. */
    async removeConversation(id: string | null): Promise<boolean> {
      if (this.mutationStatus.isLoading || this.submitStatus.isLoading) return false;
      const isDone = await withStatus(this.mutationStatus, 'isLoading', async () => {
        await (id === null ? assistantService.clearConversations() : assistantService.deleteConversation(id));
        return true;
      }, { errorFlag: 'hasError' });
      if (!isDone) return false;
      historyControllers.get(this)?.abort();
      this.historyGeneration += 1;
      this.historyStatus = requestStatus();
      invalidateLoads('assistant:');
      if (id === null || this.conversationId === id) this.newConversation();
      this.conversations = id === null ? [] : this.conversations.filter((item) => item.id !== id);
      this.conversationTotal = id === null ? 0 : Math.max(0, this.conversationTotal - 1);
      return true;
    },
    /** Turns a recording into editable text; null when it failed, with the refusal code kept. */
    async transcribe(audio: Blob, durationInSeconds: number): Promise<string | null> {
      this.transcribeErrorCode = null;
      return withStatus(this.transcribeStatus, 'isLoading', () => assistantService.transcribe(audio, durationInSeconds), { errorFlag: 'hasError' }).then((text) => {
        if (text === null) this.transcribeErrorCode = 'assistant_transcription_failed';
        return text;
      });
    },
    clear(): void {
      this.newConversation();
      historyControllers.get(this)?.abort();
      this.historyGeneration += 1;
      invalidateLoads('assistant:');
      this.conversations = [];
      this.conversationTotal = 0;
      this.hasHistoryLoaded = false;
      this.historyStatus = requestStatus();
    },
  },
});
