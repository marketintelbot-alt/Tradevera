import { useMemo, useState } from "react";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const hasToken = Boolean(token && token.trim().length > 0);

  const verifySessionWithRetry = async () => {
    const attempts = 4;
    for (let index = 0; index < attempts; index += 1) {
      try {
        const me = await api.me();
        if (me?.user?.id) {
          return me;
        }
      } catch {
        // Retry for transient cookie propagation timing.
      }
      await new Promise((resolve) => window.setTimeout(resolve, 200 * (index + 1)));
    }
    return null;
  };

  const continueSignIn = async () => {
    if (!hasToken || !token) {
      setError("Missing login token.");
      return;
    }

    setError(null);
    setStatus("loading");
    setTemporaryPassword(null);
    try {
      const consumeResult = await api.consumeMagicLink(token);
      const me = await verifySessionWithRetry();
      if (!me) {
        throw new Error("Session cookie was blocked by your browser. Disable third-party cookie blocking for this site and try again.");
      }
      await refreshMe();
      if (consumeResult.temporaryPassword) {
        setTemporaryPassword(consumeResult.temporaryPassword);
        return;
      }
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to authenticate with this link. Request a fresh magic link.";
      setError(message);
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md p-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-800">
          <ShieldCheck className="h-3.5 w-3.5" />
          Secure Login
        </div>
        <h1 className="mt-3 text-xl font-semibold text-ink-900">Confirm sign in</h1>
        <p className="mt-2 text-sm text-ink-700">
          Click below to finish your secure login. This prevents automated link scanners from burning your token.
        </p>
        {temporaryPassword && !error ? (
          <div className="mt-4 rounded-lg border border-amber-500/35 bg-amber-100 px-3 py-3 text-sm text-ink-900">
            <p className="font-semibold">Save this temporary password</p>
            <p className="mt-1 text-xs text-ink-800">Email delivery failed in this environment. Use this password for direct login.</p>
            <p className="mt-2 rounded-md bg-white px-2 py-1 font-semibold">{temporaryPassword}</p>
            <Button type="button" className="mt-3 w-full" onClick={() => navigate("/app/dashboard", { replace: true })}>
              Continue to dashboard
            </Button>
          </div>
        ) : error ? (
          <>
            <p className="mt-2 text-sm text-coral-500">{error}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => navigate("/login")}>Request new link</Button>
              <Button onClick={() => void continueSignIn()} loading={status === "loading"}>
                Try again
              </Button>
            </div>
            <p className="mt-2 text-xs text-ink-700">
              If this repeats, disable third-party cookie blocking for this site or use a custom domain for both app and API.
            </p>
          </>
        ) : (
          <div className="mt-4 space-y-3">
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                hasToken ? "border-mint-500/30 bg-mint-100/55 text-ink-800" : "border-coral-500/30 bg-coral-100/55 text-ink-900"
              }`}
            >
              <p className="inline-flex items-center gap-1">
                <CheckCircle2 className={`h-3.5 w-3.5 ${hasToken ? "text-mint-500" : "text-coral-500"}`} />
                {hasToken ? "Token detected and ready." : "No token found in this link. Request a new email."}
              </p>
            </div>
            <Button
              type="button"
              className="w-full gap-2"
              onClick={() => void continueSignIn()}
              loading={status === "loading"}
              disabled={!hasToken}
            >
              <LockKeyhole className="h-4 w-4" />
              Continue secure sign-in
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/login")}>
              Back to login
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
