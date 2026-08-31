/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the auth + persistence API. Set on Vercel for production;
   *  defaults to the local dev server when unset. */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
