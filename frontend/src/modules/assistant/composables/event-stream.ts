import type { IAssistantEvent } from 'assistant/types/assistant';

const FINAL_EVENTS = new Set(['done', 'error']);

/** One `id:` / `event:` / `data:` block of a server-sent event stream; a comment-only block (ping) gives null. */
export const parseAssistantEvent = (raw: string): IAssistantEvent | null => {
  let id = '';
  let event = 'message';
  const data: string[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('id:')) id = line.slice(3).trim();
    else if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
  }
  if (!data.length) return null;
  return { id, event, data: JSON.parse(data.join('\n')) as Record<string, unknown> };
};

/** Reads events off a byte stream until a final event is accepted (true) or the stream ends (false). */
export const readEventStream = async (body: ReadableStream<BufferSource>, onEvent: (event: IAssistantEvent) => boolean | void): Promise<boolean> => {
  const reader = body.pipeThrough<string>(new TextDecoderStream()).getReader();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return false;
      buffer += value;
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        const event = parseAssistantEvent(part.replaceAll('\r\n', '\n'));
        if (!event) continue;
        const isAccepted = onEvent(event);
        if (isAccepted !== false && FINAL_EVENTS.has(event.event)) return true;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
};
