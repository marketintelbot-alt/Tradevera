import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { RiskSettingsResponse } from "@tradevera/shared";
import { ArrowRight, Brain, ClipboardCheck, ShieldAlert, ShieldCheck, Target, Building2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/common/ToastProvider";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

export function ToolsPage() {
  const { toast } = useToast();
  const [riskAmount, setRiskAmount] = useState("100");
  const [entryPrice, setEntryPrice] = useState("100");
  const [stopPrice, setStopPrice] = useState("99");
  const [direction, setDirection] = useState<"long" | "short">("long");

  const [rEntry, setREntry] = useState("100");
  const [rStop, setRStop] = useState("99");
  const [rExit, setRExit] = useState("102");

  const [riskLoading, setRiskLoading] = useState(true);
  const [riskSaving, setRiskSaving] = useState(false);
  const [riskEnabled, setRiskEnabled] = useState(true);
  const [dailyMaxLoss, setDailyMaxLoss] = useState("");
  const [maxConsecutiveLosses, setMaxConsecutiveLosses] = useState("");
  const [cooldownMinutes, setCooldownMinutes] = useState("45");
  const [lockoutUntil, setLockoutUntil] = useState<string | null>(null);
  const [lockoutReason, setLockoutReason] = useState<string | null>(null);

  const applyRiskSettings = (response: RiskSettingsResponse) => {
    setRiskEnabled(response.settings.enabled);
    setDailyMaxLoss(response.settings.daily_max_loss === null ? "" : String(response.settings.daily_max_loss));
    setMaxConsecutiveLosses(
      response.settings.max_consecutive_losses === null ? "" : String(response.settings.max_consecutive_losses)
    );
    setCooldownMinutes(String(response.settings.cooldown_minutes));
    setLockoutUntil(response.status.lockoutUntil);
    setLockoutReason(response.status.reason);
  };

  useEffect(() => {
    const run = async () => {
      setRiskLoading(true);
      try {
        const response = await api.getRiskSettings();
        applyRiskSettings(response);
      } catch (error) {
        toast({
          title: "Unable to load risk settings",
          description: error instanceof Error ? error.message : "Unexpected error",
          tone: "error"
        });
      } finally {
        setRiskLoading(false);
      }
    };
    run().catch((error) => console.error(error));
  }, [toast]);

  const saveRiskSettings = async () => {
    setRiskSaving(true);
    try {
      const response = await api.updateRiskSettings({
        enabled: riskEnabled,
        daily_max_loss: dailyMaxLoss.trim() ? Number(dailyMaxLoss) : null,
        max_consecutive_losses: maxConsecutiveLosses.trim() ? Number(maxConsecutiveLosses) : null,
        cooldown_minutes: Number(cooldownMinutes || 45)
      });
      applyRiskSettings(response);
      toast({ title: "Risk guardrails saved", tone: "success" });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    } finally {
      setRiskSaving(false);
    }
  };

  const unlockGuardrails = async () => {
    try {
      const response = await api.unlockRiskSettings();
      applyRiskSettings(response);
      toast({ title: "Lockout cleared", tone: "success" });
    } catch (error) {
      toast({
        title: "Unlock failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    }
  };

  const positionSize = useMemo(() => {
    const risk = Number(riskAmount);
    const entry = Number(entryPrice);
    const stop = Number(stopPrice);
    const stopDistance = Math.abs(entry - stop);

    if (!Number.isFinite(risk) || !Number.isFinite(stopDistance) || stopDistance === 0) {
      return null;
    }

    return risk / stopDistance;
  }, [entryPrice, riskAmount, stopPrice]);

  const rMultiple = useMemo(() => {
    const entry = Number(rEntry);
    const stop = Number(rStop);
    const exit = Number(rExit);

    if (!Number.isFinite(entry) || !Number.isFinite(stop) || !Number.isFinite(exit)) {
      return null;
    }

    const risk = Math.abs(entry - stop);
    if (risk === 0) {
      return null;
    }

    const reward = direction === "long" ? exit - entry : entry - exit;
    return reward / risk;
  }, [direction, rEntry, rExit, rStop]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Position Size Calculator" subtitle="Set risk dollars and stop distance." />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Risk amount ($)" type="number" value={riskAmount} onChange={(e) => setRiskAmount(e.target.value)} />
            <Input label="Entry price" type="number" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
            <Input label="Stop price" type="number" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} />
          </div>
          <p className="mt-4 text-sm text-ink-800">
            Suggested position size: <strong>{positionSize === null ? "-" : formatNumber(positionSize, 4)}</strong> units
          </p>
        </Card>

        <Card>
          <CardHeader title="R-Multiple Calculator" subtitle="Evaluate trade quality by reward-to-risk." />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink-800">Direction</span>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as "long" | "short")}
                className="h-11 rounded-lg border border-ink-200 bg-white px-3 text-sm"
              >
                <option value="long">long</option>
                <option value="short">short</option>
              </select>
            </label>
            <Input label="Entry" type="number" value={rEntry} onChange={(e) => setREntry(e.target.value)} />
            <Input label="Stop" type="number" value={rStop} onChange={(e) => setRStop(e.target.value)} />
            <Input label="Exit" type="number" value={rExit} onChange={(e) => setRExit(e.target.value)} />
          </div>
          <p className="mt-4 text-sm text-ink-800">
            R multiple: <strong>{rMultiple === null ? "-" : formatNumber(rMultiple, 2)}R</strong>
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Journal OS Workflows" subtitle="Checklist templates have moved into Prep. Use these dedicated modules instead." />
        <div className="grid gap-3 md:grid-cols-2">
          <Link to="/app/prep" className="group rounded-xl border border-ink-200 bg-white p-4 transition hover:border-ink-300 hover:shadow-soft">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
              <ClipboardCheck className="h-4 w-4" />
              Prep Workspace
            </p>
            <p className="mt-2 text-sm text-ink-700">Pre-market planning, key levels, bias, if/then scenarios, and post-market review in one page.</p>
            <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-900">
              Open Prep <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </p>
          </Link>

          <Link
            to="/app/psychology"
            className="group rounded-xl border border-ink-200 bg-white p-4 transition hover:border-ink-300 hover:shadow-soft"
          >
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Brain className="h-4 w-4" />
              Psychology Tracker
            </p>
            <p className="mt-2 text-sm text-ink-700">Track emotions, tilt triggers, discipline score, and recovery protocol to improve execution behavior.</p>
            <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-900">
              Open Psychology <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </p>
          </Link>

          <Link
            to="/app/accountability"
            className="group rounded-xl border border-ink-200 bg-white p-4 transition hover:border-ink-300 hover:shadow-soft"
          >
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Target className="h-4 w-4" />
              Accountability
            </p>
            <p className="mt-2 text-sm text-ink-700">Daily scorecards, weekly commitments, and process follow-through tied to your projects/tasks workspace.</p>
            <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-900">
              Open Accountability <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </p>
          </Link>

          <Link
            to="/app/prop-firms"
            className="group rounded-xl border border-ink-200 bg-white p-4 transition hover:border-ink-300 hover:shadow-soft"
          >
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Building2 className="h-4 w-4" />
              Prop Firm Accounts
            </p>
            <p className="mt-2 text-sm text-ink-700">Track multiple eval/funded accounts, edit rules, and pair copy-trading groups with separate limits.</p>
            <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-900">
              Open Prop Firms <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </p>
          </Link>
        </div>
      </Card>

      <Card>
        <CardHeader title="Risk Guardrails" subtitle="Hard limits to protect capital and stop emotional overtrading." />

        {riskLoading ? (
          <p className="text-sm text-ink-700">Loading risk settings...</p>
        ) : (
          <div className="space-y-4">
            <label className="inline-flex items-center gap-2 text-sm text-ink-900">
              <input
                type="checkbox"
                checked={riskEnabled}
                onChange={(event) => setRiskEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-ink-300"
              />
              Enable guardrails
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="Daily max loss ($)"
                type="number"
                min={0}
                value={dailyMaxLoss}
                onChange={(event) => setDailyMaxLoss(event.target.value)}
                hint="Blank disables this rule."
              />
              <Input
                label="Max consecutive losses"
                type="number"
                min={1}
                max={20}
                value={maxConsecutiveLosses}
                onChange={(event) => setMaxConsecutiveLosses(event.target.value)}
                hint="Blank disables this rule."
              />
              <Input
                label="Cooldown minutes"
                type="number"
                min={1}
                max={600}
                value={cooldownMinutes}
                onChange={(event) => setCooldownMinutes(event.target.value)}
              />
            </div>

            {lockoutUntil ? (
              <div className="rounded-xl border border-coral-500/35 bg-coral-100/50 p-3 text-sm text-ink-900">
                <p className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4" />
                  Lockout active until {new Date(lockoutUntil).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-ink-700">Reason: {lockoutReason ?? "guardrail trigger"}</p>
                <div className="mt-2">
                  <Button size="sm" variant="secondary" onClick={unlockGuardrails}>
                    Clear lockout
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-mint-500/30 bg-mint-100/40 p-3 text-sm text-ink-900">
                <p className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  No active lockout
                </p>
                <p className="mt-1 text-xs text-ink-700">Guardrails will trigger automatic cooldown if thresholds are breached.</p>
              </div>
            )}

            <div>
              <Button onClick={saveRiskSettings} loading={riskSaving}>
                Save guardrails
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
