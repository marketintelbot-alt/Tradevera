import { useEffect, useRef, useState, type FormEvent } from "react";
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result = await api.requestMagicLink(email);
      setSent(true);
      setDebugLink(result.magicLink ?? null);
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

          <Button className="w-full" loading={loading}>
            Send login link
          </Button>
        </form>

        {sent && !debugLink && (
          <p className="mt-4 rounded-lg border border-mint-500/30 bg-mint-100 px-3 py-2 text-sm text-ink-900">
            Email sent. Open the link on this device to complete login.
          </p>
        )}

        {debugLink && (
          <div className="mt-3 rounded-lg border border-amber-500/35 bg-amber-100 px-3 py-3 text-sm text-ink-900">
            <p className="font-semibold">Local debug link</p>
            <p className="mt-1 text-xs text-ink-800">Use this only for local testing.</p>
            <a className="mt-2 inline-block break-all font-medium underline" href={debugLink}>
              {debugLink}
            </a>
          </div>
        )}

        <p className="mt-4 text-sm text-ink-700">
          Need context first? <Link to="/" className="font-semibold text-ink-900 underline">See product overview</Link>
        </p>
      </Card>
    </div>
  );
}
