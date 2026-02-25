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
            <Card className="!border-ink-900 !bg-ink-900 text-white shadow-panel">
              <p className="text-xs uppercase tracking-[0.15em] text-ink-200">Today snapshot</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-ink-200">Win rate</p>
                  <p className="text-2xl font-semibold">78%</p>
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
            <Card className="!border-mint-200 !bg-gradient-to-br !from-mint-100 !to-white">
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
          <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-2 text-xs font-medium text-ink-800 shadow-soft">
            <span>Cancel anytime</span>
            <span className="h-1 w-1 rounded-full bg-ink-400" />
            <span>Starter and Pro are 100% ad-free</span>
            <span className="h-1 w-1 rounded-full bg-ink-400" />
            <span>Upgrade in app without losing data</span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Card>
              <h3 className="text-xl font-semibold text-ink-900">Free</h3>
              <p className="mt-1 text-sm text-ink-700">Perfect for getting started</p>
              <p className="mt-5 text-3xl font-semibold text-ink-900">$0</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-700">No card required</p>
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
            <Card className="relative !border-amber-400 bg-gradient-to-b from-amber-50 to-white shadow-[0_18px_45px_-24px_rgba(245,158,11,0.65)] ring-1 ring-amber-300/70">
              <Badge tone="warning" className="absolute -top-3 left-5 border border-amber-500/40 bg-gradient-to-r from-amber-300 to-yellow-200 text-ink-950 shadow-soft">
                Most popular
              </Badge>
              <h3 className="text-xl font-semibold text-ink-900">Starter</h3>
              <p className="mt-1 text-sm text-ink-700">For active traders building consistency</p>
              <p className="mt-5 text-3xl font-semibold text-ink-900">$9.99/mo</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-700">Best value for most traders</p>
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
                <Button className="shadow-soft">Start Starter in app</Button>
              </Link>
            </Card>
            <Card className="!border-ink-900 !bg-ink-950 text-white shadow-panel">
              <div className="inline-flex items-center gap-2">
                <Badge tone="success" className="border border-mint-400/30 bg-mint-400/20 text-white">
                  Pro
                </Badge>
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-200">Full analytics + AI</span>
              </div>
              <h3 className="mt-3 text-xl font-semibold text-white">Pro</h3>
              <p className="mt-1 text-sm text-ink-100">Built for traders who want full analytics, coaching tools, and advanced review workflows</p>
              <p className="mt-5 text-3xl font-semibold text-white">$24.99/mo</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-mint-300">Premium workflow + performance suite</p>
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
                <Button variant="secondary" className="border-white/20 bg-white text-ink-950 hover:bg-ink-100">
                  Upgrade from app settings
                </Button>
              </Link>
            </Card>
          </div>

          <div className="mt-5 rounded-2xl border border-ink-200 bg-gradient-to-r from-white via-ink-100/40 to-white p-4">
            <p className="text-sm font-semibold text-ink-900">No migration friction</p>
            <p className="mt-1 text-sm text-ink-700">
              Start on Free and upgrade later without losing trades, tags, reviews, projects, or account history. Starter and Pro remove ads and unlock more of
              Journal OS.
            </p>
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
