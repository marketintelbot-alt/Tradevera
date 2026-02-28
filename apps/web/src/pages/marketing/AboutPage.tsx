import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useMarketingAdSense } from "@/lib/marketingAds";

export function AboutPage() {
  useMarketingAdSense();

  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <section className="rounded-3xl border border-ink-200 bg-white p-7 shadow-panel lg:p-10">
          <Badge tone="accent">About Tradevera</Badge>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink-950 sm:text-5xl">Why Tradevera exists</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-700">
            Tradevera is built for traders who want structured execution and measurable improvement, not scattered notes and reactive decision-making.
          </p>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="text-xl font-semibold text-ink-900">Product focus</h2>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              Tradevera combines journaling, analytics, review workflows, and accountability tools in one application. The platform is designed to make process quality visible
              so users can improve behavior, not just chase outcomes.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-ink-900">Content standards</h2>
            <p className="mt-3 text-sm leading-6 text-ink-800">
              Public resources are written to be practical and updated when workflows or assumptions change. We avoid placeholder pages and keep policy, support, and editorial
              pages visible and accessible.
            </p>
          </Card>
        </section>

        <MarketingFooter />
      </main>
    </div>
  );
}
