/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODULES?: string;
  readonly VITE_APP_API_BASE_URL: string;
  readonly VITE_MOCK_LATENCY_MS?: string;
  readonly VITE_AUTH_PUBLIC_JWK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
