import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LAST_UPDATED_LABEL } from "@/lib/lastUpdated";
import { useMarketingAdSense } from "@/lib/marketingAds";

export function TradeJournalSystemPage() {
  useMarketingAdSense();

  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <section className="rounded-3xl border border-ink-200 bg-white p-7 shadow-panel lg:p-10">
          <Badge tone="accent">Guide</Badge>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink-950 sm:text-5xl">Trade Journal System: from random notes to measurable process</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-700">
            A journal only helps when your fields are consistent and your review loop is repeatable. This framework keeps your data clean enough for analysis.
          </p>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="text-xl font-semibold text-ink-900">1) Capture context before entry</h2>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              Log the setup name, session, timeframe, and planned invalidation before execution. If those fields are missing, post-trade analysis will blur decision quality with
              outcome randomness.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-800">
              <li>Setup tag (single primary setup)</li>
              <li>Risk amount in dollars and R</li>
              <li>Planned exit logic and stop location</li>
              <li>Market condition note in one sentence</li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-ink-900">2) Record execution quality separately from PnL</h2>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              Label plan adherence independently. A losing trade can still be high quality; a winning trade can still be low quality. This separation is essential for long-term
              improvement.
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              Keep adherence scoring simple (yes/no or 1-5 scale) so you can review quickly every week.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-ink-900">3) Standardize post-trade notes</h2>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              Use the same note structure each time: what worked, what failed, and what to repeat or stop. Avoid long narratives with no action point.
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink-800">
              <li>Execution issue observed</li>
              <li>Root cause in one sentence</li>
              <li>Next-session correction rule</li>
            </ol>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-ink-900">4) Review cadence</h2>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              Run a 20-30 minute review at week end. Focus on one setup, one mistake cluster, and one rule to improve. Overloading your action list usually leads to zero
              implementation.
            </p>
            <p className="mt-3 text-xs text-ink-700">Last reviewed: {LAST_UPDATED_LABEL}.</p>
          </Card>
        </section>

        <MarketingFooter />
      </main>
    </div>
  );
}
