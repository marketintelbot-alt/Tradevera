import { useEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ADSENSE_CLIENT_ID, ADSENSE_ENABLED, getAdSlotId, type AdPlacement } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    __tradeveraAdsenseLoaded?: boolean;
  }
}

function loadAdSenseScript(clientId: string) {
  if (typeof window === "undefined" || window.__tradeveraAdsenseLoaded) {
    return;
  }

  const existing = document.querySelector<HTMLScriptElement>("script[data-tradevera-adsense='true']");
  if (existing) {
    window.__tradeveraAdsenseLoaded = true;
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
  script.crossOrigin = "anonymous";
  script.setAttribute("data-tradevera-adsense", "true");
  document.head.appendChild(script);
  window.__tradeveraAdsenseLoaded = true;
}

interface AdSlotProps {
  compact?: boolean;
  placement?: AdPlacement;
}

export function AdSlot({ compact = false, placement = "dashboard" }: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null);

  const slotId = useMemo(() => getAdSlotId(placement), [placement]);
  const canRenderGoogleAd = ADSENSE_ENABLED && Boolean(slotId);

  useEffect(() => {
    if (!canRenderGoogleAd) {
      return;
    }
    loadAdSenseScript(ADSENSE_CLIENT_ID);
  }, [canRenderGoogleAd]);

  useEffect(() => {
    if (!canRenderGoogleAd || !adRef.current) {
      return;
    }

    if (adRef.current.getAttribute("data-tv-ad-init") === "1") {
      return;
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      adRef.current.setAttribute("data-tv-ad-init", "1");
    } catch (error) {
      console.error("AdSense render error", error);
    }
  }, [canRenderGoogleAd, slotId]);

  return (
    <Card className="border-dashed border-ink-200 bg-ink-100/35">
      <div className="flex items-center justify-between">
        <Badge tone="neutral">Sponsored</Badge>
        <span className="text-[11px] uppercase tracking-wide text-ink-700">Free plan</span>
      </div>
      <div className={compact ? "mt-2" : "mt-3"}>
        {canRenderGoogleAd ? (
          <>
            <ins
              ref={adRef}
              className="adsbygoogle block min-h-[110px] w-full overflow-hidden rounded-lg bg-white/70"
              style={{ display: "block" }}
              data-ad-client={ADSENSE_CLIENT_ID}
              data-ad-slot={slotId!}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
            <p className="mt-2 text-xs text-ink-700">Ads are shown only on Free dashboard/list views.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink-900">Your ad can appear here</p>
            <p className="mt-1 text-xs text-ink-700">
              Configure AdSense env vars to enable live ads. This slot never renders inside trade entry forms.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
