import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Download, TrendingDown, TrendingUp } from "lucide-react";
import type { Trade } from "@tradevera/shared";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { useTrades } from "@/hooks/useTrades";
import { formatCurrency, formatNumber } from "@/lib/utils";

type ViewMode = "month" | "week" | "day";
type SessionKey = "Asia" | "London" | "NY" | "Other";

interface DayBucket {
  key: string;
  date: Date;
  pnl: number;
  trades: Trade[];
  wins: number;
  losses: number;
  sessionCounts: Record<SessionKey, number>;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VIEW_TABS = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" }
];

const SESSION_META: Record<SessionKey, { dot: string; label: string }> = {
  Asia: { dot: "bg-sky-500", label: "Asia" },
  London: { dot: "bg-amber-500", label: "London" },
  NY: { dot: "bg-mint-500", label: "NY" },
  Other: { dot: "bg-ink-400", label: "Other" }
};

function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function tradeDayKey(trade: Trade): string {
  const date = new Date(trade.closed_at ?? trade.opened_at);
  return dayKey(date);
}

function safePnl(trade: Trade): number {
  return Number(trade.pnl ?? 0);
}

function normalizeSession(session: Trade["session"]): SessionKey {
  if (session === "Asia" || session === "London" || session === "NY") {
    return session;
  }
  return "Other";
}

function csvEscape(value: string | number | null): string {
  const raw = value === null ? "" : String(value);
  const escaped = raw.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

export function CalendarPage() {
  const { trades, loading } = useTrades();
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  const weekStartDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(selectedDate, { weekStartsOn: 1 });

  const goToDate = (nextDate: Date) => {
    setSelectedDate(nextDate);
    setVisibleMonth(startOfMonth(nextDate));
  };

  const goToMonth = (nextMonth: Date) => {
    const normalized = startOfMonth(nextMonth);
    setVisibleMonth(normalized);
    setSelectedDate(normalized);
  };

  const shiftRange = (delta: number) => {
    if (viewMode === "month") {
      goToMonth(addMonths(visibleMonth, delta));
      return;
    }
    if (viewMode === "week") {
      goToDate(addDays(selectedDate, delta * 7));
      return;
    }
    goToDate(addDays(selectedDate, delta));
  };

  const allDayBuckets = useMemo(() => {
    const bucketMap = new Map<string, DayBucket>();

    for (const trade of trades) {
      const key = tradeDayKey(trade);
      const existing = bucketMap.get(key);
      const bucketDate = new Date(`${key}T00:00:00`);
      const pnl = safePnl(trade);
      const sessionKey = normalizeSession(trade.session);

      if (!existing) {
        bucketMap.set(key, {
          key,
          date: bucketDate,
          pnl,
          trades: [trade],
          wins: pnl > 0 ? 1 : 0,
          losses: pnl < 0 ? 1 : 0,
          sessionCounts: {
            Asia: sessionKey === "Asia" ? 1 : 0,
            London: sessionKey === "London" ? 1 : 0,
            NY: sessionKey === "NY" ? 1 : 0,
            Other: sessionKey === "Other" ? 1 : 0
          }
        });
      } else {
        existing.pnl += pnl;
        existing.trades.push(trade);
        existing.sessionCounts[sessionKey] += 1;
        if (pnl > 0) {
          existing.wins += 1;
        } else if (pnl < 0) {
          existing.losses += 1;
        }
      }
    }

    for (const bucket of bucketMap.values()) {
      bucket.trades.sort((a, b) => b.opened_at.localeCompare(a.opened_at));
    }

    return bucketMap;
  }, [trades]);

  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const monthDays = useMemo(() => {
    const days: Date[] = [];
    let cursor = monthGridStart;
    while (cursor <= monthGridEnd) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [monthGridEnd, monthGridStart]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    let cursor = weekStartDate;
    while (cursor <= weekEndDate) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [weekEndDate, weekStartDate]);

  const visibleDays = useMemo(() => {
    if (viewMode === "month") {
      return monthDays;
    }
    if (viewMode === "week") {
      return weekDays;
    }
    return [selectedDate];
  }, [monthDays, selectedDate, viewMode, weekDays]);

  const monthBuckets = useMemo(() => {
    return Array.from(allDayBuckets.values()).filter((bucket) => isSameMonth(bucket.date, visibleMonth));
  }, [allDayBuckets, visibleMonth]);

  const visibleBuckets = useMemo(() => {
    const buckets: DayBucket[] = [];
    for (const day of visibleDays) {
      const bucket = allDayBuckets.get(dayKey(day));
      if (bucket) {
        buckets.push(bucket);
      }
    }
    return buckets;
  }, [allDayBuckets, visibleDays]);

  const monthTradesForExport = useMemo(() => {
    const rows = trades.filter((trade) => {
      const date = new Date(trade.closed_at ?? trade.opened_at);
      return isSameMonth(date, visibleMonth);
    });
    rows.sort((a, b) => a.opened_at.localeCompare(b.opened_at));
    return rows;
  }, [trades, visibleMonth]);

  const monthPnl = monthBuckets.reduce((sum, bucket) => sum + bucket.pnl, 0);
  const monthTrades = monthBuckets.reduce((sum, bucket) => sum + bucket.trades.length, 0);
  const tradingDays = monthBuckets.length;
  const bestDay = monthBuckets.slice().sort((a, b) => b.pnl - a.pnl)[0] ?? null;
  const losingDays = monthBuckets.filter((bucket) => bucket.pnl < 0);
  const worstDay = losingDays.slice().sort((a, b) => a.pnl - b.pnl)[0] ?? null;

  const maxAbsDayPnl = useMemo(() => {
    const source = visibleBuckets.length > 0 ? visibleBuckets : monthBuckets;
    const maxAbs = source.reduce((max, bucket) => Math.max(max, Math.abs(bucket.pnl)), 0);
    return maxAbs === 0 ? 1 : maxAbs;
  }, [monthBuckets, visibleBuckets]);

  const selectedBucket = allDayBuckets.get(dayKey(selectedDate)) ?? null;
  const selectedTrades = selectedBucket?.trades ?? [];

  const exportMonthCsv = () => {
    const header = [
      "id",
      "opened_at",
      "closed_at",
      "symbol",
      "asset_class",
      "direction",
      "entry_price",
      "exit_price",
      "size",
      "fees",
      "pnl",
      "r_multiple",
      "setup",
      "timeframe",
      "session",
      "confidence",
      "plan_adherence",
      "notes",
      "mistakes"
    ];

    const rows = monthTradesForExport.map((trade) =>
      [
        trade.id,
        trade.opened_at,
        trade.closed_at,
        trade.symbol,
        trade.asset_class,
        trade.direction,
        trade.entry_price,
        trade.exit_price,
        trade.size,
        trade.fees,
        trade.pnl,
        trade.r_multiple,
        trade.setup,
        trade.timeframe,
        trade.session,
        trade.confidence,
        trade.plan_adherence,
        trade.notes,
        trade.mistakes
      ]
        .map((value) => csvEscape(value as string | number | null))
        .join(",")
    );

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tradevera-calendar-${format(visibleMonth, "yyyy-MM")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const calendarTitle =
    viewMode === "month"
      ? format(visibleMonth, "MMMM yyyy")
      : viewMode === "week"
        ? `${format(weekStartDate, "MMM d")} - ${format(weekEndDate, "MMM d, yyyy")}`
        : format(selectedDate, "EEEE, MMM d, yyyy");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <Skeleton className="h-[520px] w-full" />
          <Skeleton className="h-[520px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-ink-800 bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 p-6 text-white shadow-panel">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-mint-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.17em] text-ink-200">
              <CalendarDays className="h-4 w-4" />
              Calendar Edge
            </p>
            <h1 className="mt-2 text-3xl font-semibold">{format(visibleMonth, "MMMM yyyy")} PnL Calendar</h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-200">
              Heatmap view of performance with switchable month/week/day modes and day-level session context.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Tabs tabs={VIEW_TABS} activeKey={viewMode} onChange={(key) => setViewMode(key as ViewMode)} />
            <Button variant="secondary" className="gap-2" onClick={exportMonthCsv}>
              <Download className="h-4 w-4" /> Export Month CSV
            </Button>
            <Button variant="secondary" onClick={() => shiftRange(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const now = new Date();
                setVisibleMonth(startOfMonth(now));
                setSelectedDate(now);
              }}
            >
              Today
            </Button>
            <Button variant="secondary" onClick={() => shiftRange(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative z-10 mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-ink-700 bg-white/10 p-4 text-white shadow-none backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wide text-ink-200">Monthly PnL</p>
            <p className={`mt-2 text-2xl font-semibold ${monthPnl >= 0 ? "text-mint-400" : "text-coral-500"}`}>{formatCurrency(monthPnl)}</p>
          </Card>
          <Card className="border-ink-700 bg-white/10 p-4 text-white shadow-none backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wide text-ink-200">Trades</p>
            <p className="mt-2 text-2xl font-semibold">{formatNumber(monthTrades, 0)}</p>
          </Card>
          <Card className="border-ink-700 bg-white/10 p-4 text-white shadow-none backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wide text-ink-200">Trading Days</p>
            <p className="mt-2 text-2xl font-semibold">{formatNumber(tradingDays, 0)}</p>
          </Card>
          <Card className="border-ink-700 bg-white/10 p-4 text-white shadow-none backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wide text-ink-200">Avg / Day</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(tradingDays ? monthPnl / tradingDays : 0)}</p>
          </Card>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.45fr,0.95fr]">
        <Card className="p-0">
          <div className="border-b border-ink-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-ink-900">{calendarTitle}</h2>
            <p className="text-xs text-ink-700">
              {viewMode === "month"
                ? "Click any day cell to inspect trades and setup notes."
                : viewMode === "week"
                  ? "Week mode compresses focus on the current week."
                  : "Day mode highlights one date in detail."}
            </p>
          </div>

          {viewMode !== "day" && (
            <div className="grid grid-cols-7 border-b border-ink-200 bg-ink-100/50 px-3 py-2">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="px-2 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-700">
                  {label}
                </div>
              ))}
            </div>
          )}

          <div className={`grid gap-2 p-3 sm:p-4 ${viewMode === "day" ? "grid-cols-1" : "grid-cols-7"}`}>
            {visibleDays.map((date) => {
              const key = dayKey(date);
              const bucket = allDayBuckets.get(key) ?? null;
              const pnl = bucket?.pnl ?? 0;
              const tradeCount = bucket?.trades.length ?? 0;
              const active = isSameDay(selectedDate, date);
              const inMonth = isSameMonth(date, visibleMonth);
              const intensity = Math.min(1, Math.abs(pnl) / maxAbsDayPnl);

              const bgColor =
                pnl > 0
                  ? `rgba(44,213,164,${0.08 + intensity * 0.36})`
                  : pnl < 0
                    ? `rgba(238,106,93,${0.08 + intensity * 0.36})`
                    : "rgba(255,255,255,0.88)";

              const borderColor = active
                ? "#111A2E"
                : pnl > 0
                  ? "rgba(44,213,164,0.45)"
                  : pnl < 0
                    ? "rgba(238,106,93,0.45)"
                    : "#E5ECF7";

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  style={{ backgroundColor: bgColor, borderColor }}
                  className={[
                    "group rounded-xl border p-2 text-left transition hover:shadow-soft sm:p-3",
                    viewMode === "day" ? "min-h-[220px]" : "min-h-[96px] sm:min-h-[108px]",
                    viewMode === "month" && !inMonth ? "opacity-45" : "opacity-100"
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-ink-800 sm:text-sm">{format(date, "d")}</span>
                    {tradeCount > 0 ? (
                      <Badge tone="neutral" className="h-6 px-2 text-[11px]">
                        {tradeCount}
                      </Badge>
                    ) : null}
                  </div>
                  <div className={viewMode === "day" ? "mt-8" : "mt-4"}>
                    {tradeCount > 0 ? (
                      <p className={`text-xs font-semibold sm:text-sm ${pnl >= 0 ? "text-mint-500" : "text-coral-500"}`}>
                        {formatCurrency(pnl)}
                      </p>
                    ) : (
                      <p className="text-xs text-ink-700/80">No trades</p>
                    )}
                  </div>
                  {bucket && tradeCount > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {(Object.keys(SESSION_META) as SessionKey[]).map((session) =>
                        bucket.sessionCounts[session] > 0 ? (
                          <span
                            key={session}
                            className={`h-2.5 w-2.5 rounded-full ${SESSION_META[session].dot}`}
                            title={`${SESSION_META[session].label}: ${bucket.sessionCounts[session]} trade(s)`}
                          />
                        ) : null
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={format(selectedDate, "EEEE, MMM d")} subtitle="Selected day breakdown" />
            {selectedBucket ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-ink-100 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-ink-700">Day PnL</p>
                    <p className={`mt-1 text-lg font-semibold ${selectedBucket.pnl >= 0 ? "text-mint-500" : "text-coral-500"}`}>
                      {formatCurrency(selectedBucket.pnl)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-ink-100 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-ink-700">Trades</p>
                    <p className="mt-1 text-lg font-semibold text-ink-900">{selectedBucket.trades.length}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(Object.keys(SESSION_META) as SessionKey[]).map((session) =>
                    selectedBucket.sessionCounts[session] > 0 ? (
                      <span
                        key={session}
                        className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-900"
                      >
                        <span className={`h-2 w-2 rounded-full ${SESSION_META[session].dot}`} />
                        {SESSION_META[session].label} {selectedBucket.sessionCounts[session]}
                      </span>
                    ) : null
                  )}
                </div>

                <div className="space-y-2">
                  {selectedTrades.map((trade) => (
                    <article key={trade.id} className="rounded-lg border border-ink-200 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink-900">
                          {trade.symbol} <span className="text-ink-700">({trade.direction})</span>
                        </p>
                        <span className={`text-sm font-semibold ${Number(trade.pnl ?? 0) >= 0 ? "text-mint-500" : "text-coral-500"}`}>
                          {formatCurrency(Number(trade.pnl ?? 0))}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink-700">
                        {trade.setup ?? "Unlabeled setup"} · {trade.timeframe ?? "n/a"} · {trade.session ?? "n/a"}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-ink-200 bg-ink-100/45 p-5 text-center">
                <p className="text-base font-semibold text-ink-900">No trades for this day</p>
                <p className="mt-2 text-sm text-ink-700">Pick another date in the calendar or add a trade to start tracking daily edge.</p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Month Highlights" subtitle="Best and worst sessions in view" />
            <div className="mb-3 flex flex-wrap gap-3 text-xs text-ink-700">
              {(Object.keys(SESSION_META) as SessionKey[]).map((session) => (
                <span key={session} className="inline-flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${SESSION_META[session].dot}`} />
                  {SESSION_META[session].label}
                </span>
              ))}
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-mint-500/30 bg-mint-100/60 p-3">
                <div className="inline-flex items-center gap-2 text-ink-900">
                  <TrendingUp className="h-4 w-4 text-mint-500" />
                  Best day
                </div>
                <div className="text-right">
                  <p className="font-semibold text-mint-500">{bestDay ? formatCurrency(bestDay.pnl) : "n/a"}</p>
                  <p className="text-xs text-ink-700">{bestDay ? format(bestDay.date, "MMM d") : "-"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-coral-500/30 bg-coral-100/60 p-3">
                <div className="inline-flex items-center gap-2 text-ink-900">
                  <TrendingDown className="h-4 w-4 text-coral-500" />
                  Worst day
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${worstDay ? "text-coral-500" : "text-mint-500"}`}>
                    {worstDay ? formatCurrency(worstDay.pnl) : "No losing day"}
                  </p>
                  <p className="text-xs text-ink-700">{worstDay ? format(worstDay.date, "MMM d") : "All days green"}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
