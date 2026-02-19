export type AdPlacement = "dashboard" | "trades" | "footer";

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

export const ADSENSE_CLIENT_ID = clean(import.meta.env.VITE_ADSENSE_CLIENT_ID);
export const ADSENSE_ENABLED = ADSENSE_CLIENT_ID.length > 0;

const AD_SLOT_BY_PLACEMENT: Record<AdPlacement, string> = {
  dashboard: clean(import.meta.env.VITE_ADSENSE_SLOT_DASHBOARD),
  trades: clean(import.meta.env.VITE_ADSENSE_SLOT_TRADES),
  footer: clean(import.meta.env.VITE_ADSENSE_SLOT_FOOTER)
};

export function getAdSlotId(placement: AdPlacement): string | null {
  const slot = AD_SLOT_BY_PLACEMENT[placement];
  return slot.length > 0 ? slot : null;
}
