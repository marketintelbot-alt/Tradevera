/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ADSENSE_CLIENT_ID?: string;
  readonly VITE_ADSENSE_SLOT_DASHBOARD?: string;
  readonly VITE_ADSENSE_SLOT_TRADES?: string;
  readonly VITE_ADSENSE_SLOT_FOOTER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
