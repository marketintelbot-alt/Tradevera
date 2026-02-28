import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LAST_UPDATED_LABEL } from "@/lib/lastUpdated";
import { useMarketingAdSense } from "@/lib/marketingAds";

export function WeeklyReviewPlaybookPage() {
  useMarketingAdSense();

  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <section className="rounded-3xl border border-ink-200 bg-white p-7 shadow-panel lg:p-10">
          <Badge tone="accent">Playbook</Badge>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink-950 sm:text-5xl">Weekly review playbook for performance growth</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-700">
            This review flow is designed for consistency. It turns raw trade logs into one focused plan for the next week.
          </p>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="text-xl font-semibold text-ink-900">Preparation (10 minutes)</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-800">
              <li>Filter for the exact review window.</li>
              <li>Separate strategy outcomes by setup tag.</li>
              <li>Flag all trades with low plan adherence.</li>
              <li>Pull one screenshot example per recurring mistake.</li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-ink-900">Analysis (15 minutes)</h2>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              Review three metrics only: expectancy, drawdown pattern, and adherence rate. If one metric worsens while others improve, prioritize behavior that drives that
              metric directly.
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-800">Do not optimize everything at once. Pick one behavior to fix and one behavior to reinforce.</p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-ink-900">Execution plan (5 minutes)</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink-800">
              <li>One setup focus for next week.</li>
              <li>One hard rule that prevents a common mistake.</li>
              <li>One review checkpoint mid-week.</li>
            </ol>
            <p className="mt-3 text-sm leading-6 text-ink-800">Write the plan before market open on Monday to avoid reactive adjustments.</p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-ink-900">What to avoid</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-800">
              <li>Changing strategy from a single outlier day.</li>
              <li>Ignoring adherence data because PnL was green.</li>
              <li>Adding multiple new rules in one week.</li>
            </ul>
            <p className="mt-3 text-xs text-ink-700">Last reviewed: {LAST_UPDATED_LABEL}.</p>
          </Card>
        </section>

        <MarketingFooter />
      </main>
    </div>
  );
}
