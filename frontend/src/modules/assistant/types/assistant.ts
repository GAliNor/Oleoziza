import type { PeriodKey } from 'global/types/period';

export type AnswerKind = 'answer' | 'off_topic' | 'clarify';

export type QuestionStatus = 'pending' | 'answered' | 'failed';

export type ChatStage = 'queued' | 'understanding' | 'searching' | 'deepening' | 'writing' | 'receiving' | 'reconnecting';

export type ColumnKind = 'text' | 'enum' | 'number' | 'amount' | 'litres' | 'kilograms' | 'days' | 'date' | 'id';

export type BlockType = 'number' | 'table' | 'bar_chart' | 'cards';

export interface IAnswerColumn {
  key: string;
  kind: ColumnKind;
}

export interface IAnswerFact extends IAnswerColumn {
  value: string | number | null;
}

export interface IAnswerRecord {
  id: string;
  entity: string;
  label: string;
  link: string | null;
  facts: IAnswerFact[];
}

export interface IAnswerReporting {
  dateField: string;
  from: string | null;
  to: string | null;
}

export interface IAnswerBlock {
  type: BlockType;
  title: string;
  columns: IAnswerColumn[];
  rows: Record<string, string | number | null>[];
  labelField: string | null;
  valueField: string | null;
  entity: string | null;
  records: IAnswerRecord[];
  reporting: IAnswerReporting | null;
  isTruncated: boolean;
}

export interface IPlannedBlock {
  type: BlockType;
  title: string;
}

export interface IAnswerChoice {
  entity: string;
  recordId: string;
  label: string;
}

export interface IAnswerScope {
  siteNames: string[];
  period: PeriodKey;
}

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'matches';

export type CalcOperator = 'difference' | 'ratio' | 'days_between';

export interface IAnswerMethodFilter {
  field: string;
  op: FilterOperator;
  value: string;
}

export interface IAnswerMethodQuery {
  entity: string;
  measures: string[];
  groupBy: string[];
  filters: IAnswerMethodFilter[];
  period: string | null;
  compare: 'previous_period' | 'previous_season' | null;
}

export interface IAnswerMethodCalc {
  op: CalcOperator;
  left: string;
  right: string;
}

/** What the answer read and computed, in declared names, for « Comment c’est calculé ». */
export interface IAnswerMethod {
  queries: IAnswerMethodQuery[];
  calcs: IAnswerMethodCalc[];
}

export interface IAssistantAnswer {
  kind: AnswerKind;
  message: string;
  blocks: IAnswerBlock[];
  choices: IAnswerChoice[];
  scope: IAnswerScope | null;
  computedAt: string | null;
  /** Follow-up questions the Assistant can answer, in the asker's language. */
  suggestions?: string[];
  method?: IAnswerMethod | null;
}

export interface IAssistantQuestion {
  id: string;
  conversationId: string;
  text: string;
  status: QuestionStatus;
  answer: IAssistantAnswer | null;
  errorCode: string | null;
  rating: number | null;
  createdAt: string;
  streamCursor: string | null;
}

export interface IConversationListItem {
  id: string;
  title: string;
  updatedAt: string;
}

export interface IConversation {
  id: string;
  title: string;
  questions: IAssistantQuestion[];
}

export interface IConversationPage {
  items: IConversationListItem[];
  total: number;
}

export interface IAssistantEvent {
  id: string;
  event: string;
  data: Record<string, unknown>;
}

export interface IAskPayload {
  text: string;
  conversationId: string | null;
  requestId: string;
  siteId: string | null;
  period: PeriodKey;
}

export interface IAssistantService {
  ask(payload: IAskPayload, signal?: AbortSignal): Promise<IAssistantQuestion>;
  choose(questionId: string, choice: IAnswerChoice, signal?: AbortSignal): Promise<IAssistantQuestion>;
  retry(questionId: string, signal?: AbortSignal): Promise<IAssistantQuestion>;
  rate(questionId: string, rating: number): Promise<IAssistantQuestion>;
  listConversations(offset: number, limit: number, signal?: AbortSignal): Promise<IConversationPage>;
  getConversation(conversationId: string, signal?: AbortSignal): Promise<IConversation>;
  deleteConversation(conversationId: string): Promise<void>;
  clearConversations(): Promise<void>;
  transcribe(audio: Blob, durationInSeconds: number): Promise<string>;
  /** Reads the answer's events until done or error (true), or until the stream ends early (false). */
  streamEvents(questionId: string, lastEventId: string | null, onEvent: (event: IAssistantEvent) => boolean | void, signal: AbortSignal): Promise<boolean>;
}

export interface IRequestStatus {
  isLoading: boolean;
  hasError: boolean;
}

export interface IStreamedAnswer {
  stage: ChatStage;
  entities: string[];
  message: string;
  plannedBlocks: IPlannedBlock[];
  blocks: IAnswerBlock[];
  choices: IAnswerChoice[];
  lastEventId: string | null;
  startedAt: number;
  isDisconnected: boolean;
}

export interface IAssistantStore {
  conversationId: string | null;
  questions: IAssistantQuestion[];
  streamed: Record<string, IStreamedAnswer>;
  conversations: IConversationListItem[];
  conversationTotal: number;
  hasHistoryLoaded: boolean;
  generation: number;
  historyGeneration: number;
  submitStatus: IRequestStatus;
  openStatus: IRequestStatus;
  historyStatus: IRequestStatus;
  mutationStatus: IRequestStatus;
  feedbackStatus: IRequestStatus;
  streamStatus: IRequestStatus;
  transcribeStatus: IRequestStatus;
  transcribeErrorCode: string | null;
}
