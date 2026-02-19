import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader } from "@/components/ui/Card";
import { TradeForm } from "@/components/trades/TradeForm";
import { useToast } from "@/components/common/ToastProvider";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function NewTradePage() {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refreshMe } = useAuth();

  const handleSubmit = async (payload: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const response = await api.createTrade(payload);
      await refreshMe();
      toast({ title: "Trade saved", description: "Trade synced to cloud journal.", tone: "success" });
      if (response.riskTriggered) {
        toast({
          title: "Risk guardrail triggered",
          description: `Lockout active until ${new Date(response.riskTriggered.lockoutUntil).toLocaleString()} (${response.riskTriggered.reason}).`,
          tone: "info"
        });
      }
      navigate("/app/trades");
    } catch (error) {
      if (error instanceof ApiError && error.status === 402) {
        toast({ title: "Free limit reached", description: error.message, tone: "error" });
      } else if (error instanceof ApiError && error.status === 423) {
        toast({ title: "Trading lockout active", description: error.message, tone: "error" });
      } else {
        toast({ title: "Could not save trade", description: error instanceof Error ? error.message : "Unexpected error", tone: "error" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Advanced Trade Entry"
        subtitle="Capture full context including confidence, session, mistakes, and execution notes."
      />
      <TradeForm mode="full" onSubmit={handleSubmit} submitting={submitting} submitLabel="Save trade" />
    </Card>
  );
}
