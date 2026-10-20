/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE: 'mock' | 'api';
  readonly VITE_APP_API_BASE_URL: string;
  readonly VITE_MOCK_LATENCY_MS?: string;
  readonly VITE_AUTH_PUBLIC_JWK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
