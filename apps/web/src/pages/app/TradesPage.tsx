import { useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { Trade } from "@tradevera/shared";
import { AdSlot } from "@/components/ads/AdSlot";
import { EmptyState } from "@/components/common/EmptyState";
import { QuickAddTradeModal } from "@/components/trades/QuickAddTradeModal";
import { TradeForm } from "@/components/trades/TradeForm";
import { TradeScreenshotManager } from "@/components/trades/TradeScreenshotManager";
import { TradeTable } from "@/components/trades/TradeTable";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/common/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { useTrades } from "@/hooks/useTrades";
import { ApiError, api } from "@/lib/api";

export function TradesPage() {
  const { user, refreshMe } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { trades, loading, loadTrades } = useTrades();

  const [search, setSearch] = useState("");
  const [symbolFilter, setSymbolFilter] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [screenTrade, setScreenTrade] = useState<Trade | null>(null);
  const [todayOnly, setTodayOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const searchMatch =
        search.length === 0 ||
        trade.symbol.toLowerCase().includes(search.toLowerCase()) ||
        (trade.setup ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (trade.notes ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (trade.mistakes ?? "").toLowerCase().includes(search.toLowerCase());

      const symbolMatch = symbolFilter.length === 0 || trade.symbol === symbolFilter.toUpperCase();
      const todayMatch =
        !todayOnly ||
        new Date(trade.opened_at).toDateString() === new Date().toDateString();

      return searchMatch && symbolMatch && todayMatch;
    });
  }, [search, symbolFilter, todayOnly, trades]);

  const handleCreateTrade = async (payload: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const response = await api.createTrade(payload);
      await loadTrades();
      await refreshMe();
      setQuickAddOpen(false);
      toast({ title: "Trade added", description: "Synced to your cloud journal.", tone: "success" });
      if (response.riskTriggered) {
        toast({
          title: "Risk guardrail triggered",
          description: `Lockout active until ${new Date(response.riskTriggered.lockoutUntil).toLocaleString()} (${response.riskTriggered.reason}).`,
          tone: "info"
        });
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 402) {
        if (error.message.toLowerCase().includes("50 days")) {
          toast({
            title: "Free plan expired",
            description: error.message,
            tone: "error"
          });
          navigate("/app/settings");
        } else {
          setLimitModalOpen(true);
        }
      } else if (error instanceof ApiError && error.status === 423) {
        toast({
          title: "Trading lockout active",
          description:
            typeof error.details === "object" && error.details && "lockoutUntil" in error.details
              ? `Pause until ${new Date(String((error.details as { lockoutUntil: string }).lockoutUntil)).toLocaleString()}.`
              : error.message,
          tone: "error"
        });
      } else {
        toast({ title: "Could not save trade", description: error instanceof Error ? error.message : "Unexpected error", tone: "error" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTrade = async (payload: Record<string, unknown>) => {
    if (!editingTrade) {
      return;
    }

    setSubmitting(true);
    try {
      await api.updateTrade(editingTrade.id, payload);
      await loadTrades();
      setEditingTrade(null);
      toast({ title: "Trade updated", tone: "success" });
    } catch (error) {
      toast({ title: "Update failed", description: error instanceof Error ? error.message : "Unexpected error", tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTrade = async (trade: Trade) => {
    const confirmed = window.confirm(`Delete ${trade.symbol} trade from ${new Date(trade.opened_at).toLocaleDateString()}?`);
    if (!confirmed) {
      return;
    }

    try {
      await api.deleteTrade(trade.id);
      await loadTrades();
      await refreshMe();
      toast({ title: "Trade deleted", tone: "success" });
    } catch (error) {
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Unexpected error", tone: "error" });
    }
  };

  const handleCsvImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const raw = await file.text();
    const rows = raw
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean);

    if (rows.length < 2) {
      toast({ title: "CSV import failed", description: "No data rows found.", tone: "error" });
      return;
    }

    const headers = rows[0].split(",").map((item) => item.trim().toLowerCase());
    const dataRows = rows.slice(1);

    let created = 0;
    let failed = 0;

    for (const row of dataRows) {
      const values = row.split(",").map((value) => value.trim());
      const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));

      try {
        await api.createTrade({
          opened_at: new Date(record.opened_at).toISOString(),
          closed_at: record.closed_at ? new Date(record.closed_at).toISOString() : null,
          symbol: record.symbol,
          asset_class: record.asset_class || "stocks",
          direction: record.direction || "long",
          entry_price: Number(record.entry_price),
          exit_price: record.exit_price ? Number(record.exit_price) : null,
          size: Number(record.size),
          fees: Number(record.fees || 0),
          setup: record.setup || null,
          timeframe: record.timeframe || null,
          session: record.session || null,
          confidence: record.confidence ? Number(record.confidence) : null,
          plan_adherence: record.plan_adherence ? record.plan_adherence === "true" : true,
          notes: record.notes || null,
          mistakes: record.mistakes || null,
          r_multiple: record.r_multiple ? Number(record.r_multiple) : null
        });
        created += 1;
      } catch {
        failed += 1;
      }
    }

    await loadTrades();
    await refreshMe();
    toast({
      title: "CSV import completed",
      description: `${created} trades created${failed ? `, ${failed} skipped` : ""}.`,
      tone: failed ? "info" : "success"
    });

    event.target.value = "";
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Trade Journal"
          subtitle="Sort, filter, and edit executions with cloud sync."
          action={
            <div className="flex gap-2">
              <Button variant={todayOnly ? "primary" : "secondary"} onClick={() => setTodayOnly((value) => !value)}>
                Today
              </Button>
              <Button variant="secondary" onClick={() => navigate("/app/trades/new")}>Advanced add</Button>
              <Button onClick={() => setQuickAddOpen(true)}>Quick add</Button>
            </div>
          }
        />

        <div className="grid gap-3 sm:grid-cols-[1fr,180px,auto]">
          <Input label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Symbol, setup, notes..." />
          <Input label="Symbol filter" value={symbolFilter} onChange={(e) => setSymbolFilter(e.target.value.toUpperCase())} placeholder="AAPL" />
          <label className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 px-3 text-sm text-ink-800">
            Import CSV
            <input type="file" accept=".csv" className="w-[120px] text-xs" onChange={handleCsvImport} />
          </label>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : filteredTrades.length === 0 ? (
        <EmptyState
          title="No trades yet"
          description="Capture your first trade with quick add or advanced entry."
          actionLabel="Add trade"
          onAction={() => setQuickAddOpen(true)}
        />
      ) : (
        <TradeTable trades={filteredTrades} onEdit={setEditingTrade} onScreens={setScreenTrade} onDelete={handleDeleteTrade} />
      )}

      {user?.plan === "free" && <AdSlot compact placement="trades" />}

      <QuickAddTradeModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} submitting={submitting} onSubmit={handleCreateTrade} />

      <Modal open={Boolean(editingTrade)} onClose={() => setEditingTrade(null)} title="Edit trade">
        {editingTrade && (
          <TradeForm
            mode="full"
            initialValue={editingTrade}
            submitLabel="Save changes"
            submitting={submitting}
            onSubmit={handleUpdateTrade}
            onCancel={() => setEditingTrade(null)}
          />
        )}
      </Modal>

      <Modal open={Boolean(screenTrade)} onClose={() => setScreenTrade(null)} title="Trade screenshots">
        {screenTrade && <TradeScreenshotManager tradeId={screenTrade.id} />}
      </Modal>

      <Modal open={limitModalOpen} onClose={() => setLimitModalOpen(false)} title="Free plan limit reached">
        <p className="text-sm text-ink-700">Free plan limited to 50 trades. Upgrade to Pro for unlimited entries and advanced analytics.</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => navigate("/app/settings")}>Upgrade to Pro</Button>
          <Button variant="secondary" onClick={() => setLimitModalOpen(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}
