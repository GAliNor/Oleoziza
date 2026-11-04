let accessToken: string | null = null;

let refresher: (() => Promise<void>) | null = null;

let inFlightRefresh: Promise<void> | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => accessToken;

export const setTokenRefresher = (refresh: () => Promise<void>): void => {
  refresher = refresh;
};

/** Runs at most one refresh at a time; every caller waiting on an expired token shares it. */
export const refreshAccessToken = (): Promise<void> => {
  if (!refresher) return Promise.reject(new Error('No token refresher registered'));
  inFlightRefresh ??= refresher().finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
};
