import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useMarketingAdSense } from "@/lib/marketingAds";

export function TermsPage() {
  useMarketingAdSense();

  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <section className="rounded-3xl border border-ink-200 bg-white p-7 shadow-panel lg:p-10">
          <Badge tone="accent">Terms of Use</Badge>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink-950 sm:text-5xl">Tradevera terms</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-700">Effective date: February 28, 2026.</p>
        </section>

        <section className="mt-8 grid gap-4">
          <Card>
            <h2 className="text-xl font-semibold text-ink-900">Service scope</h2>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              Tradevera is software for journaling and analytics workflows. It does not provide brokerage services, investment recommendations, or financial advice.
            </p>

            <h2 className="mt-5 text-xl font-semibold text-ink-900">User responsibility</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-800">
              <li>You are responsible for your trading decisions and risk management.</li>
              <li>You are responsible for protecting account credentials.</li>
              <li>You must comply with applicable laws and market regulations.</li>
            </ul>

            <h2 className="mt-5 text-xl font-semibold text-ink-900">No performance guarantee</h2>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              Platform analytics and historical metrics do not guarantee future trading outcomes.
            </p>
          </Card>
        </section>

        <MarketingFooter />
      </main>
    </div>
  );
}
