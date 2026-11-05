const MOCK_LATENCY_MS = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 300);

/** Rejects instead of hanging when the data can't be copied, as a real request would fail. */
export const mockResolve = <T>(data: T): Promise<T> =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(structuredClone(data));
      } catch (error) {
        reject(error);
      }
    }, MOCK_LATENCY_MS),
  );

export const mockReject = (error: unknown): Promise<never> =>
  new Promise((_, reject) => setTimeout(() => reject(error), MOCK_LATENCY_MS));
