export type AdPlacement = "dashboard" | "trades" | "footer";

const FALLBACK_ADSENSE_CLIENT_ID = "ca-pub-3104636149734693";

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

export const ADSENSE_CLIENT_ID = clean(import.meta.env.VITE_ADSENSE_CLIENT_ID) || FALLBACK_ADSENSE_CLIENT_ID;
export const APP_ADS_ENABLED = clean(import.meta.env.VITE_APP_ADS_ENABLED).toLowerCase() === "true";
export const ADSENSE_ENABLED = APP_ADS_ENABLED && ADSENSE_CLIENT_ID.length > 0;

const AD_SLOT_BY_PLACEMENT: Record<AdPlacement, string> = {
  dashboard: clean(import.meta.env.VITE_ADSENSE_SLOT_DASHBOARD),
  trades: clean(import.meta.env.VITE_ADSENSE_SLOT_TRADES),
  footer: clean(import.meta.env.VITE_ADSENSE_SLOT_FOOTER)
};

export function getAdSlotId(placement: AdPlacement): string | null {
  const slot = AD_SLOT_BY_PLACEMENT[placement];
  return slot.length > 0 ? slot : null;
}
