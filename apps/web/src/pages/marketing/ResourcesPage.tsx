import { Link } from "react-router-dom";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useMarketingAdSense } from "@/lib/marketingAds";

const guides = [
  {
    title: "Trade Journal System",
    href: "/resources/trade-journal-system",
    summary: "Build a repeatable journaling process that captures context, execution quality, and post-trade decisions."
  },
  {
    title: "Weekly Review Playbook",
    href: "/resources/weekly-review-playbook",
    summary: "Run one structured review each week so your adjustments are measured and not based on emotion."
  },
  {
    title: "Risk Journal Checklist",
    href: "/resources/risk-journal-checklist",
    summary: "Use a pre-session and post-session risk checklist to reduce rule drift and overtrading."
  }
];

export function ResourcesPage() {
  useMarketingAdSense();

  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <section className="rounded-3xl border border-ink-200 bg-white p-7 shadow-panel lg:p-10">
          <Badge tone="accent">Tradevera Resources</Badge>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink-950 sm:text-5xl">Actionable guides for improving trading consistency</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-700">
            These resources are written for practical execution. Each guide focuses on one workflow with clear steps, review criteria, and decision thresholds.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {guides.map((guide) => (
            <Card key={guide.href}>
              <h2 className="text-xl font-semibold text-ink-900">{guide.title}</h2>
              <p className="mt-3 text-sm leading-6 text-ink-800">{guide.summary}</p>
              <Link className="mt-4 inline-block text-sm font-semibold text-ink-900 underline decoration-mint-500 decoration-2" to={guide.href}>
                Read guide
              </Link>
            </Card>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-ink-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink-900">How this content is maintained</h2>
          <p className="mt-2 text-sm leading-6 text-ink-800">
            Content is revised when platform behavior changes, when user feedback identifies ambiguity, or when workflows need correction. Each page has a visible update date.
          </p>
        </section>

        <MarketingFooter />
      </main>
    </div>
  );
}
