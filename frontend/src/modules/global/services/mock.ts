const MOCK_LATENCY_MS = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 300);

export const mockResolve = <T>(data: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), MOCK_LATENCY_MS));
