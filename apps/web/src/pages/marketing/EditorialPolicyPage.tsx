import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useMarketingAdSense } from "@/lib/marketingAds";

export function EditorialPolicyPage() {
  useMarketingAdSense();

  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <section className="rounded-3xl border border-ink-200 bg-white p-7 shadow-panel lg:p-10">
          <Badge tone="accent">Editorial Policy</Badge>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink-950 sm:text-5xl">How Tradevera public content is produced</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-700">Policy date: February 28, 2026.</p>
        </section>

        <section className="mt-8 grid gap-4">
          <Card>
            <h2 className="text-xl font-semibold text-ink-900">Scope</h2>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              We publish content related to trading journal workflows, review systems, process discipline, and risk management behavior.
            </p>

            <h2 className="mt-5 text-xl font-semibold text-ink-900">Quality standards</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-800">
              <li>Use practical, repeatable steps.</li>
              <li>State limitations and uncertainty clearly.</li>
              <li>Avoid placeholder or duplicated pages.</li>
              <li>Correct outdated sections when assumptions change.</li>
            </ul>

            <h2 className="mt-5 text-xl font-semibold text-ink-900">Corrections</h2>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              Users can request corrections through the contact page. Material updates revise the published update date.
            </p>
          </Card>
        </section>

        <MarketingFooter />
      </main>
    </div>
  );
}
