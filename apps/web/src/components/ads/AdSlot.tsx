import { useEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { ADSENSE_CLIENT_ID, ADSENSE_ENABLED, getAdSlotId, type AdPlacement } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    __tradeveraAdsenseLoaded?: boolean;
    __tradeveraAdSlotInstances?: number;
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

function unloadAdSenseArtifacts() {
  if (typeof window === "undefined") {
    return;
  }

  const scripts = document.querySelectorAll<HTMLScriptElement>("script[data-tradevera-adsense='true']");
  scripts.forEach((script) => script.remove());

  // Defensive cleanup for auto-placed nodes if auto-ads was enabled in AdSense UI.
  const autoPlaced = document.querySelectorAll<HTMLElement>(".google-auto-placed, [id^='aswift_']");
  autoPlaced.forEach((node) => node.remove());

  window.__tradeveraAdsenseLoaded = false;
  window.adsbygoogle = [];
}

interface AdSlotProps {
  compact?: boolean;
  placement?: AdPlacement;
}

export function AdSlot({ compact = false, placement = "dashboard" }: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null);
  const { user } = useAuth();

  const slotId = useMemo(() => getAdSlotId(placement), [placement]);
  const isFreePlan = user?.plan === "free";
  const canLoadAdSense = isFreePlan && ADSENSE_ENABLED;
  const canRenderGoogleAd = canLoadAdSense && Boolean(slotId);

  useEffect(() => {
    if (isFreePlan) {
      return;
    }
    unloadAdSenseArtifacts();
  }, [isFreePlan]);

  useEffect(() => {
    if (!canLoadAdSense) {
      return;
    }

    window.__tradeveraAdSlotInstances = (window.__tradeveraAdSlotInstances ?? 0) + 1;
    loadAdSenseScript(ADSENSE_CLIENT_ID);

    return () => {
      window.__tradeveraAdSlotInstances = Math.max(0, (window.__tradeveraAdSlotInstances ?? 1) - 1);
      if ((window.__tradeveraAdSlotInstances ?? 0) === 0) {
        unloadAdSenseArtifacts();
      }
    };
  }, [canLoadAdSense]);

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

  if (!isFreePlan) {
    return null;
  }

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
            <p className="mt-2 text-xs text-ink-700">Ads appear only on the Free plan. Starter and Pro are fully ad-free.</p>
          </>
        ) : canLoadAdSense ? (
          <>
            <p className="text-sm font-semibold text-ink-900">Free plan sponsorship area</p>
            <p className="mt-1 text-xs text-ink-700">
              AdSense script is active for Free users. Configure slot IDs to pin this placement, or manage auto-ads in AdSense.
            </p>
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
