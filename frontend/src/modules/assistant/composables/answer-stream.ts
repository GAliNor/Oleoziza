import type { IAssistantEvent, IAssistantService } from 'assistant/types/assistant';

const MAXIMUM_RECONNECTS = 3;
const RECONNECT_DELAY_MS = 700;
const RECOVERY_INTERVAL_MS = 30_000;

const waitForReconnect = (milliseconds: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const finish = (): void => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener('abort', finish, { once: true });
    if (signal.aborted) finish();
  });

/** Follows an answer's events, resuming after the last one seen; a dropped stream first checks the saved answer, then reconnects a few times. */
export const readAnswerStream = async (
  service: IAssistantService,
  questionId: string,
  cursor: () => string | null,
  onEvent: (event: IAssistantEvent) => boolean | void,
  onReconnect: () => void,
  recover: () => Promise<boolean>,
  signal: AbortSignal,
): Promise<boolean> => {
  for (let attempt = 0; attempt <= MAXIMUM_RECONNECTS; attempt += 1) {
    if (signal.aborted) return false;
    const attemptController = new AbortController();
    const abort = (): void => attemptController.abort();
    signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, RECOVERY_INTERVAL_MS);
    try {
      if (await service.streamEvents(questionId, cursor(), onEvent, attemptController.signal)) return true;
    } catch {
      if (signal.aborted) return false;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
    if (signal.aborted) return false;
    if (await recover()) return true;
    if (attempt === MAXIMUM_RECONNECTS) break;
    onReconnect();
    await waitForReconnect(RECONNECT_DELAY_MS * (attempt + 1), signal);
  }
  return false;
};
