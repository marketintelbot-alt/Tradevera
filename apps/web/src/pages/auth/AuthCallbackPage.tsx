import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }
    handledRef.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setError("Missing login token.");
      return;
    }

    (async () => {
      try {
        await api.consumeMagicLink(token);
        await refreshMe();
        navigate("/app/dashboard", { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to authenticate with this link.");
      }
    })();
  }, [navigate, refreshMe, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-semibold text-ink-900">Signing you in…</h1>
        {error ? (
          <>
            <p className="mt-2 text-sm text-coral-500">{error}</p>
            <Button className="mt-4" onClick={() => navigate("/login")}>Back to login</Button>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-700">Completing secure session.</p>
        )}
      </Card>
    </div>
  );
}
