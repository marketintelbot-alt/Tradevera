import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Mail, RefreshCw, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/common/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import type { UserMe } from "@tradevera/shared";
import { api, decodeSessionTokenClaims } from "@/lib/api";

export function LoginPage() {
  const navigate = useNavigate();
  const { user, refreshMe, setAuthUser } = useAuth();
  const [authMode, setAuthMode] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordRequestLoading, setPasswordRequestLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [debugLink, setDebugLink] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null);
  const [sentGlow, setSentGlow] = useState(false);
  const [delivery, setDelivery] = useState<"email" | "debug" | null>(null);
  const [lastClickedAt, setLastClickedAt] = useState<string | null>(null);
  const [debugPassword, setDebugPassword] = useState<string | null>(null);
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

  useEffect(() => {
    if (user?.id) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [navigate, user?.id]);

  const verifySessionWithRetry = async (sessionToken?: string) => {
    if (sessionToken) {
      try {
        const meWithToken = await api.meWithSessionToken(sessionToken);
        if (meWithToken?.user?.id) {
          return meWithToken;
        }
      } catch {
        // Fall through to standard retry path.
      }
    }

    const attempts = 4;
    for (let index = 0; index < attempts; index += 1) {
      try {
        const me = await api.me();
        if (me?.user?.id) {
          return me;
        }
      } catch {
        // Retry transient CORS/cookie propagation failures.
      }
      await new Promise((resolve) => window.setTimeout(resolve, 200 * (index + 1)));
    }
    return null;
  };

  const buildProvisionalUser = (sessionToken: string | undefined, fallbackEmail: string): UserMe | null => {
    if (!sessionToken) {
      return null;
    }
    const claims = decodeSessionTokenClaims(sessionToken);
    if (!claims) {
      return null;
    }

    const sameCachedUser = user && user.email.toLowerCase() === claims.email.toLowerCase() ? user : null;
    const plan = claims.plan ?? sameCachedUser?.plan ?? "free";
    return {
      id: claims.sub,
      email: claims.email || fallbackEmail,
      plan,
      tradeCount: sameCachedUser?.tradeCount ?? 0,
      tradeLimit: plan === "free" ? (sameCachedUser?.tradeLimit ?? 50) : null,
      freeDaysTotal: plan === "free" ? (sameCachedUser?.freeDaysTotal ?? 50) : null,
      freeDaysRemaining: plan === "free" ? (sameCachedUser?.freeDaysRemaining ?? null) : null,
      freeExpiresAt: plan === "free" ? (sameCachedUser?.freeExpiresAt ?? null) : null,
      freeExpired: plan === "free" ? (sameCachedUser?.freeExpired ?? false) : false,
      canUseProFeatures: plan === "pro"
    };
  };

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
    setDebugPassword(null);

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

  const signInWithPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      toast({
        title: "Credentials required",
        description: "Enter your email and password.",
        tone: "error"
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const loginResult = await api.loginWithPassword(normalizedEmail, password);
      const provisionalUser = buildProvisionalUser(loginResult.sessionToken, normalizedEmail);
      if (provisionalUser) {
        setAuthUser(provisionalUser);
      }

      const me = await verifySessionWithRetry(loginResult.sessionToken);
      if (me?.user?.id) {
        setAuthUser(me.user);
      }
      // Keep profile data fresh in the background without blocking navigation.
      void refreshMe();
      toast({
        title: "Signed in",
        description: "Welcome back.",
        tone: "success"
      });
      navigate("/app/dashboard", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid credentials.";
      const sessionHandshakeIssue = /unable to establish a login session|session cookie was blocked/i.test(message);
      if (sessionHandshakeIssue) {
        try {
          if ("serviceWorker" in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((registration) => registration.unregister()));
          }
          if ("caches" in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map((key) => caches.delete(key)));
          }
        } catch {
          // Continue regardless; the user can still retry manually.
        }
      }
      toast({
        title: "Login failed",
        description: sessionHandshakeIssue
          ? "Session handshake issue detected. Refreshing login state, then try once more."
          : message,
        tone: "error"
      });
      if (sessionHandshakeIssue) {
        window.setTimeout(() => window.location.reload(), 200);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const requestPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast({
        title: "Email required",
        description: "Enter your email so we can send your password.",
        tone: "error"
      });
      return;
    }

    setPasswordRequestLoading(true);
    setDebugPassword(null);
    try {
      const result = await api.requestPassword(normalizedEmail);
      if (result.temporaryPassword) {
        setDebugPassword(result.temporaryPassword);
      }
      toast({
        title: result.delivery === "debug" ? "Temporary password generated" : "Password email sent",
        description:
          result.delivery === "debug"
            ? "Email delivery failed in this environment. Use the temporary password below."
            : "Check your inbox for login credentials.",
        tone: "success"
      });
    } catch (error) {
      toast({
        title: "Password request failed",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        tone: "error"
      });
    } finally {
      setPasswordRequestLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void sendLink();
  };

  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    void signInWithPassword();
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
        <h1 className="mt-2 text-3xl font-semibold text-ink-900">Login to Tradevera</h1>
        <p className="mt-2 text-sm text-ink-700">Use magic link or sign in directly with your email and password.</p>

        <div className="mt-5">
          <Tabs
            activeKey={authMode}
            onChange={(value) => setAuthMode(value === "password" ? "password" : "magic")}
            tabs={[
              { key: "magic", label: "Magic link" },
              { key: "password", label: "Password login" }
            ]}
          />
        </div>

        {authMode === "magic" ? (
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
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submitPassword}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@desk.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <Button type="submit" className="w-full" loading={passwordLoading}>
              Sign in with password
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              loading={passwordRequestLoading}
              onClick={() => void requestPassword()}
            >
              Email me a password
            </Button>
            <p className="text-xs text-ink-700">
              First-time users: complete a magic-link login once and Tradevera will send your password to this email.
            </p>
          </form>
        )}

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

        {debugLink && authMode === "magic" && (
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

        {debugPassword && (
          <div className="mt-3 rounded-lg border border-amber-500/35 bg-amber-100 px-3 py-3 text-sm text-ink-900">
            <p className="font-semibold">Temporary password (email fallback)</p>
            <p className="mt-1 text-xs text-ink-800">Email delivery failed in this environment. Use this password to sign in now.</p>
            <p className="mt-2 rounded-md bg-white px-2 py-1 font-semibold">{debugPassword}</p>
          </div>
        )}

        <p className="mt-4 text-sm text-ink-700">
          Need context first? <Link to="/" className="font-semibold text-ink-900 underline">See product overview</Link>
        </p>
      </Card>
    </div>
  );
}
