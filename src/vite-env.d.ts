/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_USE_SAME_ORIGIN_API?: string
  readonly VITE_FORCE_SAME_ORIGIN_API?: string
  /** Optional override; defaults to `${VITE_API_BASE_URL}/integrations/npi` */
  readonly VITE_HEALTHIFY_NPI_URL?: string
  /** Optional local-dev proxy target for `/api` (see vite.config.js) */
  readonly VITE_DEV_API_PROXY_TARGET?: string
  readonly VITE_CLOUDINARY_UPLOAD_URL: string
  readonly VITE_CLOUDINARY_UPLOAD_PRESET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
