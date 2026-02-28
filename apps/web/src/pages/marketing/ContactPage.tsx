import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useMarketingAdSense } from "@/lib/marketingAds";

export function ContactPage() {
  useMarketingAdSense();

  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <section className="rounded-3xl border border-ink-200 bg-white p-7 shadow-panel lg:p-10">
          <Badge tone="accent">Contact</Badge>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink-950 sm:text-5xl">Support and policy contact</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-700">Use the channels below for product support, corrections, and policy questions.</p>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="text-xl font-semibold text-ink-900">Support</h2>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              GitHub issues: <a className="underline" href="https://github.com/marketintelbot-alt/Tradevera/issues" target="_blank" rel="noopener">github.com/marketintelbot-alt/Tradevera/issues</a>
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-800">
              Include your browser, operating system, and steps to reproduce the issue.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-ink-900">Policy questions</h2>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              For policy or content concerns, open an issue and label it <strong>policy</strong>. For sensitive matters, request a private follow-up channel in the same issue.
            </p>
            <p className="mt-2 text-xs text-ink-700">Target response: within 3 business days.</p>
          </Card>
        </section>

        <MarketingFooter />
      </main>
    </div>
  );
}
