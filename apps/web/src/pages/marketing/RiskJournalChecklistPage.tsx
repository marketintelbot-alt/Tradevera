import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LAST_UPDATED_LABEL } from "@/lib/lastUpdated";
import { useMarketingAdSense } from "@/lib/marketingAds";

export function RiskJournalChecklistPage() {
  useMarketingAdSense();

  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <section className="rounded-3xl border border-ink-200 bg-white p-7 shadow-panel lg:p-10">
          <Badge tone="accent">Risk Process</Badge>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink-950 sm:text-5xl">Risk journal checklist for disciplined execution</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-700">
            Use this checklist before and after each session to keep position sizing, loss limits, and behavior limits aligned with your plan.
          </p>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <Card>
            <h2 className="text-lg font-semibold text-ink-900">Pre-session</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-800">
              <li>Daily max loss set and visible.</li>
              <li>Max number of trades defined.</li>
              <li>Primary setup selected.</li>
              <li>No revenge-trading trigger from previous day.</li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-ink-900">In-session</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-800">
              <li>Risk per trade stays within rule.</li>
              <li>No position size increase after loss.</li>
              <li>Entries follow setup criteria.</li>
              <li>Lockout respected when triggered.</li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-ink-900">Post-session</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-800">
              <li>Mistake category logged per trade.</li>
              <li>Rule breaches counted and summarized.</li>
              <li>Corrective action chosen for next session.</li>
              <li>No strategy rewrite based on one day.</li>
            </ul>
          </Card>
        </section>

        <section className="mt-4 rounded-2xl border border-ink-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink-900">Checklist scoring</h2>
          <p className="mt-2 text-sm leading-6 text-ink-800">
            Track your checklist completion as a weekly score. Improvement in checklist discipline usually leads risk stability before it leads immediate PnL changes.
          </p>
          <p className="mt-3 text-xs text-ink-700">Last reviewed: {LAST_UPDATED_LABEL}.</p>
        </section>

        <MarketingFooter />
      </main>
    </div>
  );
}
