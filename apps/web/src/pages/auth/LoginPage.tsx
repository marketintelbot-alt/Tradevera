import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Mail, RefreshCw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/common/ToastProvider";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [debugLink, setDebugLink] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null);
  const [sentGlow, setSentGlow] = useState(false);
  const [delivery, setDelivery] = useState<"email" | "debug" | null>(null);
  const [lastClickedAt, setLastClickedAt] = useState<string | null>(null);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const previousThemeRef = useRef<"light" | "dark" | null>(null);

  useEffect(() => {
    previousThemeRef.current = theme;
    if (theme !== "light") {
      setTheme("light");
    }

    return () => {
      if (previousThemeRef.current === "dark") {
        setTheme("dark");
      }
    };
    // Intentionally run once on page mount/unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sent || loading) {
      return;
    }

    setSentGlow(true);
    const timer = window.setTimeout(() => setSentGlow(false), 1800);
    return () => window.clearTimeout(timer);
  }, [loading, sent, requestId]);

  const sendLink = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast({
        title: "Email required",
        description: "Enter your email address to receive a magic link.",
        tone: "error"
      });
      return;
    }

    setLastClickedAt(new Date().toLocaleTimeString());
    setLoading(true);
    setDebugLink(null);
    setRequestId(null);
    setSent(false);
    setDelivery(null);

    try {
      const result = await api.requestMagicLink(normalizedEmail);
      setSent(true);
      setDebugLink(result.magicLink ?? null);
      setRequestId(result.requestId ?? null);
      setLastSentEmail(normalizedEmail);
      setDelivery(result.delivery ?? null);
      toast({
        title: result.delivery === "debug" ? "Debug login link ready" : "Magic link sent",
        description:
          result.delivery === "debug"
            ? "Email delivery failed, but you can continue using the debug login link."
            : "Check your inbox. Link expires in 15 minutes.",
        tone: "success"
      });
    } catch (error) {
      toast({
        title: "Could not send login link",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        tone: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void sendLink();
  };

  const copyDebugLink = async () => {
    if (!debugLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(debugLink);
      toast({ title: "Link copied", description: "Paste it into this browser to continue login.", tone: "success" });
    } catch {
      toast({ title: "Copy failed", description: "Select and copy the link manually.", tone: "error" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg p-7">
        <p className="text-xs uppercase tracking-[0.16em] text-ink-700">Tradevera</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink-900">Login with magic link</h1>
        <p className="mt-2 text-sm text-ink-700">No passwords. We email a one-time secure link to your inbox.</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@desk.com"
            required
          />

          <Button
            type="submit"
            className={`w-full ${sent && !loading && sentGlow ? "animate-pulse" : ""}`}
            loading={loading}
            variant={sent && !loading ? "success" : "primary"}
          >
            {sent && !loading ? "Link sent. Click to resend" : "Send login link"}
          </Button>
        </form>

        {lastClickedAt && (
          <p className="mt-3 inline-flex items-center gap-1 text-xs text-ink-700">
            <Sparkles className="h-3.5 w-3.5 text-mint-500" />
            Request registered at {lastClickedAt}.
          </p>
        )}

        {sent && delivery === "email" && !debugLink && (
          <div className="mt-4 rounded-xl border border-mint-500/30 bg-gradient-to-br from-mint-100 via-white to-mint-100 px-4 py-3 text-sm text-ink-900">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-full bg-white p-1.5 text-mint-500 shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="font-semibold">Magic link is on the way</p>
                <p className="mt-1 text-ink-800">
                  Sent to <span className="font-medium text-ink-900">{lastSentEmail ?? email}</span>. Open the email on
                  this device to complete login.
                </p>
                {requestId && (
                  <p className="mt-1 text-xs text-ink-700">
                    Delivery ID: <span className="font-medium text-ink-900">{requestId}</span>
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void sendLink()} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Resend link
                  </Button>
                  <p className="inline-flex items-center gap-1 text-xs text-ink-700">
                    <Mail className="h-3.5 w-3.5 text-ink-700" />
                    Check Promotions and Spam folders too.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {debugLink && (
          <div className="mt-3 rounded-lg border border-amber-500/35 bg-amber-100 px-3 py-3 text-sm text-ink-900">
            <p className="font-semibold">Instant login link (email fallback)</p>
            <p className="mt-1 text-xs text-ink-800">
              Email delivery is currently restricted. Use this one-time secure link to log in now.
            </p>
            <a className="mt-2 inline-block break-all font-medium underline" href={debugLink}>
              {debugLink}
            </a>
            <div className="mt-2">
              <Button size="sm" variant="secondary" onClick={copyDebugLink}>
                Copy link
              </Button>
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-ink-700">
          Need context first? <Link to="/" className="font-semibold text-ink-900 underline">See product overview</Link>
        </p>
      </Card>
    </div>
  );
}
