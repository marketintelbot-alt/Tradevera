import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/common/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { ApiError, api } from "@/lib/api";

export function SettingsPage() {
  const { user, refreshMe } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [checkoutLoadingTier, setCheckoutLoadingTier] = useState<"starter" | "pro" | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";

  useEffect(() => {
    if (success) {
      refreshMe().catch((error) => {
        console.error(error);
      });
      toast({
        title: "Subscription payment completed",
        description: "Your paid plan will activate as soon as Stripe webhook is received.",
        tone: "success"
      });
    }
  }, [refreshMe, success, toast]);

  const usageRatio = useMemo(() => {
    if (!user?.tradeLimit) {
      return 0;
    }

    return Math.min(100, Math.round((user.tradeCount / user.tradeLimit) * 100));
  }, [user?.tradeCount, user?.tradeLimit]);

  const freeDaysUsageRatio = useMemo(() => {
    if (!user?.freeDaysTotal || user.freeDaysRemaining === null) {
      return 0;
    }
    const used = user.freeDaysTotal - user.freeDaysRemaining;
    return Math.min(100, Math.round((used / user.freeDaysTotal) * 100));
  }, [user?.freeDaysRemaining, user?.freeDaysTotal]);

  const startCheckout = async (tier: "starter" | "pro") => {
    setCheckoutLoadingTier(tier);
    try {
      const { checkoutUrl } = await api.createCheckoutSession({ tier });
      window.location.href = checkoutUrl;
    } catch (error) {
      const details =
        error instanceof ApiError &&
        typeof error.details === "object" &&
        error.details &&
        "details" in error.details &&
        typeof (error.details as { details?: unknown }).details === "string"
          ? (error.details as { details: string }).details
          : null;

      toast({
        title: "Checkout launch failed",
        description: details ?? (error instanceof Error ? error.message : "Unexpected error"),
        tone: "error"
      });
    } finally {
      setCheckoutLoadingTier(null);
    }
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const { portalUrl } = await api.createPortalSession();
      window.location.href = portalUrl;
    } catch (error) {
      toast({
        title: "Could not open billing portal",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Plan & Billing" subtitle="Manage your subscription and feature access." />

        <div className="flex items-center gap-3">
          {user.plan === "pro" ? (
            <Badge tone="success">Pro active</Badge>
          ) : user.plan === "starter" ? (
            <Badge tone="accent">Starter active</Badge>
          ) : (
            <Badge tone="warning">Free plan</Badge>
          )}
          <span className="text-sm text-ink-700">Logged in as {user.email}</span>
        </div>

        {user.plan === "free" ? (
          <div className="mt-5 space-y-4 rounded-xl border border-ink-200 bg-ink-100/50 p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-ink-800">
                <span>Trade usage</span>
                <span>
                  {user.tradeCount}/{user.tradeLimit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white">
                <div className="h-2 rounded-full bg-ink-900" style={{ width: `${usageRatio}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-ink-800">
                <span>Free plan time window</span>
                <span>
                  {user.freeDaysRemaining}/{user.freeDaysTotal} days remaining
                </span>
              </div>
              <div className="h-2 rounded-full bg-white">
                <div className="h-2 rounded-full bg-amber-500" style={{ width: `${freeDaysUsageRatio}%` }} />
              </div>
              <p className="text-xs text-ink-700">
                Free access includes up to 50 days and 50 trades. Upgrade any time to remove both limits.
              </p>
            </div>

            <p className="text-sm text-ink-700">
              Starter removes ads and free limits. Pro adds AI Assistant, weekly review exports, and advanced analytics.
            </p>
            <p className="text-xs font-medium text-ink-900">Ads are Free-plan only. Starter and Pro never show ads.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => void startCheckout("starter")}
                loading={checkoutLoadingTier === "starter"}
              >
                Upgrade to Starter ($9.99)
              </Button>
              <Button onClick={() => void startCheckout("pro")} loading={checkoutLoadingTier === "pro"}>
                Upgrade to Pro
              </Button>
            </div>
          </div>
        ) : user.plan === "starter" ? (
          <div className="mt-4 space-y-3 rounded-xl border border-mint-500/35 bg-mint-100/55 p-4 text-sm text-ink-900">
            <p>Starter is active. Ads are removed and free limits are lifted.</p>
            <p>Upgrade to Pro whenever you want AI Assistant, advanced analytics, and weekly review PDF exports.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" loading={portalLoading} onClick={openBillingPortal}>
                Manage billing
              </Button>
              <Button onClick={() => void startCheckout("pro")} loading={checkoutLoadingTier === "pro"}>
                Upgrade to Pro
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3 rounded-xl border border-mint-500/40 bg-mint-100/60 p-4 text-sm text-ink-900">
            <p>Pro is active. AI Assistant, advanced analytics, weekly review export, and unlimited trade sync are unlocked.</p>
            <div>
              <Button variant="secondary" loading={portalLoading} onClick={openBillingPortal}>
                Manage billing
              </Button>
            </div>
          </div>
        )}
      </Card>

      {(success || canceled) && (
        <Card>
          <CardHeader title="Checkout status" />
          {success ? (
            <p className="text-sm text-ink-800">Payment succeeded. If plan does not update immediately, click refresh after webhook delivery.</p>
          ) : (
            <p className="text-sm text-ink-800">Checkout canceled. Your current plan remains unchanged.</p>
          )}
          <div className="mt-4">
            <Button variant="secondary" onClick={() => refreshMe()}>
              Refresh plan status
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Session" subtitle="Security and login state" />
        <p className="text-sm text-ink-700">Sessions use HttpOnly JWT cookies. Logout immediately invalidates existing sessions.</p>
      </Card>
    </div>
  );
}
