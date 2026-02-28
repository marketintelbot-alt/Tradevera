import { useEffect } from "react";

const FALLBACK_ADSENSE_CLIENT_ID = "ca-pub-3104636149734693";

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

const ADSENSE_CLIENT_ID = clean(import.meta.env.VITE_ADSENSE_CLIENT_ID) || FALLBACK_ADSENSE_CLIENT_ID;

function ensureMarketingAdScript(clientId: string): void {
  const existing = document.querySelector<HTMLScriptElement>(
    "script[data-tradevera-marketing-adsense='true'], script[src*='pagead2.googlesyndication.com/pagead/js/adsbygoogle.js']"
  );
  if (existing) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
  script.crossOrigin = "anonymous";
  script.setAttribute("data-tradevera-marketing-adsense", "true");
  document.head.appendChild(script);
}

function removeMarketingAdScriptIfOwned(): void {
  const script = document.querySelector<HTMLScriptElement>("script[data-tradevera-marketing-adsense='true']");
  if (script) {
    script.remove();
  }
}

declare global {
  interface Window {
    __tradeveraMarketingAdRefs?: number;
  }
}

export function useMarketingAdSense(): void {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.__tradeveraMarketingAdRefs = (window.__tradeveraMarketingAdRefs ?? 0) + 1;
    ensureMarketingAdScript(ADSENSE_CLIENT_ID);

    return () => {
      const nextCount = Math.max(0, (window.__tradeveraMarketingAdRefs ?? 1) - 1);
      window.__tradeveraMarketingAdRefs = nextCount;
      if (nextCount === 0) {
        removeMarketingAdScriptIfOwned();
      }
    };
  }, []);
}
