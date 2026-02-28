import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LAST_UPDATED_LABEL } from "@/lib/lastUpdated";
import { useMarketingAdSense } from "@/lib/marketingAds";

export function PrivacyPage() {
  useMarketingAdSense();

  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <section className="rounded-3xl border border-ink-200 bg-white p-7 shadow-panel lg:p-10">
          <Badge tone="accent">Privacy Policy</Badge>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink-950 sm:text-5xl">How Tradevera handles data</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-700">Last updated: {LAST_UPDATED_LABEL}.</p>
        </section>

        <section className="mt-8 grid gap-4">
          <Card>
            <h2 className="text-xl font-semibold text-ink-900">What we collect</h2>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              We process account information and journaling data required to provide the service. Authentication and billing providers may process related account metadata based
              on your usage.
            </p>

            <h2 className="mt-5 text-xl font-semibold text-ink-900">Advertising</h2>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              Marketing pages may load Google AdSense for eligible placements. Paid plans are ad-free in app. Third-party advertising providers may use cookies according to
              their own policies.
            </p>

            <h2 className="mt-5 text-xl font-semibold text-ink-900">Your controls</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-800">
              <li>Request account data export through support.</li>
              <li>Request account deletion through support.</li>
              <li>Manage ad personalization preferences via Google settings.</li>
            </ul>
          </Card>
        </section>

        <MarketingFooter />
      </main>
    </div>
  );
}
