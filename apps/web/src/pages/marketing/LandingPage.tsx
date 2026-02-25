import { useEffect, useRef } from "react";
import { AlertTriangle, ArrowRight, Check, Shield, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/context/ThemeContext";

const features = [
  "Fast trade capture with quick-add and advanced forms",
  "Prep, psychology, accountability, and prop-firm account workflows in one Journal OS",
  "Projects + tasks command center for process execution",
  "Trader-grade analytics with streaks, drawdown, and setup edge",
  "AI Assistant coaching with personalized action items (Pro only)",
  "Weekly review reports with action items and PDF export",
  "Cloud sync, cross-device access, and secure magic-link login"
];

export function LandingPage() {
  const { theme, setTheme } = useTheme();
  const previousThemeRef = useRef<"light" | "dark" | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    previousThemeRef.current = theme;
    root.classList.remove("dark");

    if (theme !== "light") {
      setTheme("light");
    }

    return () => {
      if (previousThemeRef.current === "dark") {
        root.classList.add("dark");
        setTheme("dark");
      }
    };
    // Intentionally run once on page mount/unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <MarketingNav />

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <section className="grid gap-8 rounded-3xl border border-ink-200 bg-white p-7 shadow-panel lg:grid-cols-[1.1fr,0.9fr] lg:p-10">
          <div>
            <Badge tone="accent">Built for serious traders</Badge>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink-950 sm:text-5xl">
              Tradevera turns raw trades into a performance system.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-ink-700">
              Track trades, review performance, and build consistency with a clean trading journal built for real execution workflows.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-700">
              New to Tradevera? Start with your email only. Tradevera creates your account automatically and guides you through your first login.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/login">
                <Button size="lg" className="gap-2">
                  Start free (email only) <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="secondary">
                  Already have an account? Log in
                </Button>
              </Link>
              <span className="text-sm text-ink-700">No credit card required. Free includes cloud sync up to 50 trades for up to 50 days.</span>
            </div>

            <div className="mt-6 rounded-2xl border border-ink-200 bg-ink-100/45 p-4">
              <p className="text-sm font-semibold text-ink-900">How sign up works (simple)</p>
              <ol className="mt-2 space-y-1 text-sm text-ink-800">
                <li>1. Enter your email and request a secure login link.</li>
                <li>2. Click the link in your inbox to create/sign in to your account.</li>
                <li>3. Tradevera can email you a password for faster future logins.</li>
              </ol>
            </div>

            <ul className="mt-8 grid gap-2 sm:grid-cols-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-ink-800">
                  <Check className="mt-0.5 h-4 w-4 text-mint-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <Card className="bg-ink-900 text-white">
              <p className="text-xs uppercase tracking-[0.15em] text-ink-200">Today snapshot</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-ink-200">Win rate</p>
                  <p className="text-2xl font-semibold">62.5%</p>
                </div>
                <div>
                  <p className="text-xs text-ink-200">PnL</p>
                  <p className="text-2xl font-semibold">$4,830</p>
                </div>
                <div>
                  <p className="text-xs text-ink-200">Best setup</p>
                  <p className="text-sm font-semibold">Opening Range Break</p>
                </div>
                <div>
                  <p className="text-xs text-ink-200">Drawdown</p>
                  <p className="text-sm font-semibold">$620</p>
                </div>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-mint-100 to-white">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Sparkles className="h-4 w-4" /> Weekly Review AI-style summary
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-800">Top setup: VWAP reclaim (+$1,290). Main leak: late entries (4 instances).</p>
              <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-ink-800">
                <li>Reduce size after two consecutive losses.</li>
                <li>Only trade NY open setup between 9:30-10:30.</li>
                <li>Pause and checklist before re-entry.</li>
              </ul>
            </Card>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold text-ink-900">Pricing</h2>
          <p className="mt-2 text-sm text-ink-700">
            Start free, grow into Starter, and unlock full Pro tooling when ready.
          </p>
          <p className="mt-1 text-sm font-medium text-ink-900">Starter and Pro are 100% ad-free.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Card>
              <h3 className="text-xl font-semibold text-ink-900">Free</h3>
              <p className="mt-1 text-sm text-ink-700">Perfect for getting started</p>
              <p className="mt-5 text-3xl font-semibold text-ink-900">$0</p>
              <ul className="mt-4 space-y-2 text-sm text-ink-800">
                <li>Up to 50 trades</li>
                <li>Up to 50 days on Free</li>
                <li>Core dashboard analytics</li>
                <li>Projects + tasks workspace</li>
                <li>Cloud sync across devices</li>
                <li>Subtle ads on dashboard/list views</li>
                <li>AI Assistant locked (upgrade to Pro)</li>
              </ul>
              <Link to="/login" className="mt-5 inline-block">
                <Button variant="secondary">Start on Free</Button>
              </Link>
            </Card>
            <Card className="relative border-ink-900 shadow-panel">
              <Badge tone="accent" className="absolute -top-3 left-5">
                Most popular
              </Badge>
              <h3 className="text-xl font-semibold text-ink-900">Starter</h3>
              <p className="mt-1 text-sm text-ink-700">For active traders building consistency</p>
              <p className="mt-5 text-3xl font-semibold text-ink-900">$9.99/mo</p>
              <ul className="mt-4 space-y-2 text-sm text-ink-800">
                <li>No ads</li>
                <li>No 50-day/50-trade free caps</li>
                <li>Cloud sync across devices</li>
                <li>Core dashboard + Journal OS workflows</li>
                <li>Prep, Psychology, Accountability, Prop Firms</li>
                <li>Projects + tasks workspace</li>
                <li>Upgrade to Pro any time</li>
              </ul>
              <Link to="/login" className="mt-5 inline-block">
                <Button>Start Starter in app</Button>
              </Link>
            </Card>
            <Card className="border-ink-900 bg-ink-900 text-white">
              <h3 className="text-xl font-semibold">Pro</h3>
              <p className="mt-1 text-sm text-ink-200">Built for traders who want full analytics and coaching tools</p>
              <p className="mt-5 text-3xl font-semibold">$24.99/mo</p>
              <ul className="mt-4 space-y-2 text-sm text-ink-100">
                <li>Unlimited trades</li>
                <li>Everything in Starter</li>
                <li>Projects + tasks workspace</li>
                <li>Profit factor, expectancy, drawdown, rolling win rate</li>
                <li>AI Assistant with trade-data coaching</li>
                <li>Weekly review + PDF export</li>
                <li>No ads</li>
              </ul>
              <Link to="/login" className="mt-5 inline-block">
                <Button variant="secondary">Upgrade from app settings</Button>
              </Link>
            </Card>
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <Card className="border-amber-500/30 bg-amber-100/40">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Important: Tradevera is not financial advice
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-800">
              Tradevera is journaling, analytics, and workflow software. It does not provide investment recommendations, trade signals, or financial advice.
              You are solely responsible for your trading decisions and risk management.
            </p>
          </Card>

          <Card className="border-mint-500/25 bg-mint-100/35">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Shield className="h-4 w-4 text-mint-500" />
              Platform and risk disclosure
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-800">
              Trading futures, options, forex, and crypto involves substantial risk and may not be suitable for all users. Past performance analytics in Tradevera
              do not guarantee future results.
            </p>
          </Card>
        </section>

        <footer className="mt-10 border-t border-ink-200 pt-6">
          <p className="text-xs leading-5 text-ink-700">
            Tradevera is a productivity and analytics tool for trade journaling and review. Not a broker, not a financial advisor, and not a provider of
            investment advice. Use of the platform does not replace your own due diligence or professional advice where applicable.
          </p>
        </footer>
      </main>
    </div>
  );
}
