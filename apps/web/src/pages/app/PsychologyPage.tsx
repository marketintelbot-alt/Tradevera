import { useMemo, useState } from "react";
import { Brain, Gauge, HeartPulse, ShieldAlert } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { useTrades } from "@/hooks/useTrades";
import { formatCurrency } from "@/lib/utils";

interface PsychologyEntry {
  date: string;
  preMarketEmotion: string;
  postMarketEmotion: string;
  energy: number | null;
  disciplineScore: number | null;
  tiltLevel: number | null;
  triggers: string[];
  recoveryProtocol: string;
  notes: string;
  updatedAt: string;
}

const STORAGE_KEY = "tradevera_psychology_entries_v1";
const TRIGGERS = ["FOMO", "Revenge", "Hesitation", "Overtrading", "Boredom", "Fear", "Impatience", "Tilt carryover"];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function emptyEntry(date: string): PsychologyEntry {
  return {
    date,
    preMarketEmotion: "",
    postMarketEmotion: "",
    energy: null,
    disciplineScore: null,
    tiltLevel: null,
    triggers: [],
    recoveryProtocol: "",
    notes: "",
    updatedAt: new Date().toISOString()
  };
}

export function PsychologyPage() {
  const [entriesMap, setEntriesMap] = useLocalStorageState<Record<string, PsychologyEntry>>(STORAGE_KEY, {});
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const { trades } = useTrades();

  const entry = entriesMap[selectedDate] ?? emptyEntry(selectedDate);

  const updateEntry = (patch: Partial<PsychologyEntry>) => {
    setEntriesMap((current) => ({
      ...current,
      [selectedDate]: {
        ...(current[selectedDate] ?? emptyEntry(selectedDate)),
        ...patch,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const recentEntries = useMemo(() => {
    return Object.values(entriesMap).sort((a, b) => b.date.localeCompare(a.date));
  }, [entriesMap]);

  const summary = useMemo(() => {
    const entries = recentEntries.slice(0, 30);
    const average = (values: Array<number | null>) => {
      const valid = values.filter((value): value is number => typeof value === "number");
      if (valid.length === 0) {
        return null;
      }
      return valid.reduce((sum, value) => sum + value, 0) / valid.length;
    };

    const triggerCounts = new Map<string, number>();
    for (const item of entries) {
      for (const trigger of item.triggers) {
        triggerCounts.set(trigger, (triggerCounts.get(trigger) ?? 0) + 1);
      }
    }

    const topTriggers = Array.from(triggerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      avgDiscipline: average(entries.map((item) => item.disciplineScore)),
      avgTilt: average(entries.map((item) => item.tiltLevel)),
      avgEnergy: average(entries.map((item) => item.energy)),
      topTriggers
    };
  }, [recentEntries]);

  const selectedDayPnl = useMemo(() => {
    return trades
      .filter((trade) => (trade.closed_at ?? trade.opened_at).slice(0, 10) === selectedDate)
      .reduce((sum, trade) => sum + Number(trade.pnl ?? 0), 0);
  }, [selectedDate, trades]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Psychology" subtitle="Track behavior, emotions, and recovery patterns that affect execution quality." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Avg discipline (30 entries)</p>
            <p className="mt-2 text-2xl font-semibold text-ink-900">{summary.avgDiscipline === null ? "-" : summary.avgDiscipline.toFixed(1)}/10</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Avg tilt</p>
            <p className="mt-2 text-2xl font-semibold text-ink-900">{summary.avgTilt === null ? "-" : summary.avgTilt.toFixed(1)}/10</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Avg energy</p>
            <p className="mt-2 text-2xl font-semibold text-ink-900">{summary.avgEnergy === null ? "-" : summary.avgEnergy.toFixed(1)}/10</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Selected day PnL</p>
            <p className={`mt-2 text-2xl font-semibold ${selectedDayPnl >= 0 ? "text-mint-500" : "text-coral-500"}`}>{formatCurrency(selectedDayPnl)}</p>
          </Card>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <CardHeader
            title="Daily Psychology Log"
            subtitle="Use this after market close (or during breaks) to track your mental game."
            action={
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
              />
            }
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Pre-market emotion"
              value={entry.preMarketEmotion}
              onChange={(event) => updateEntry({ preMarketEmotion: event.target.value })}
              placeholder="Calm, focused, anxious..."
            />
            <Input
              label="Post-market emotion"
              value={entry.postMarketEmotion}
              onChange={(event) => updateEntry({ postMarketEmotion: event.target.value })}
              placeholder="Satisfied, frustrated, tired..."
            />
            <Input
              label="Energy (0-10)"
              type="number"
              min={0}
              max={10}
              value={entry.energy ?? ""}
              onChange={(event) => updateEntry({ energy: event.target.value ? Number(event.target.value) : null })}
            />
            <Input
              label="Discipline score (0-10)"
              type="number"
              min={0}
              max={10}
              value={entry.disciplineScore ?? ""}
              onChange={(event) => updateEntry({ disciplineScore: event.target.value ? Number(event.target.value) : null })}
            />
            <Input
              label="Tilt level (0-10)"
              type="number"
              min={0}
              max={10}
              value={entry.tiltLevel ?? ""}
              onChange={(event) => updateEntry({ tiltLevel: event.target.value ? Number(event.target.value) : null })}
            />
            <div className="rounded-lg border border-ink-200 bg-ink-100/55 px-3 py-2 text-sm text-ink-900">
              <p className="font-semibold">Autosave</p>
              <p className="mt-1 text-xs text-ink-700">Entries save locally while you type to keep this fast and low-friction.</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-800">
              <ShieldAlert className="h-4 w-4" />
              Trigger tags
            </p>
            <div className="flex flex-wrap gap-2">
              {TRIGGERS.map((trigger) => {
                const selected = entry.triggers.includes(trigger);
                return (
                  <button
                    key={trigger}
                    type="button"
                    onClick={() =>
                      updateEntry({
                        triggers: selected ? entry.triggers.filter((item) => item !== trigger) : [...entry.triggers, trigger]
                      })
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      selected ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-800"
                    }`}
                  >
                    {trigger}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink-800">
                <HeartPulse className="h-4 w-4" /> Recovery protocol
              </span>
              <textarea
                rows={4}
                value={entry.recoveryProtocol}
                onChange={(event) => updateEntry({ recoveryProtocol: event.target.value })}
                placeholder="Step away 10 min, breathe, review checklist, reduce size, wait for A+ setup."
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-700/55 focus:border-ink-700 focus:ring-4 focus:ring-ink-200/70"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink-800">
                <Brain className="h-4 w-4" /> Notes
              </span>
              <textarea
                rows={4}
                value={entry.notes}
                onChange={(event) => updateEntry({ notes: event.target.value })}
                placeholder="What triggered mistakes? What behavior helped?"
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-700/55 focus:border-ink-700 focus:ring-4 focus:ring-ink-200/70"
              />
            </label>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Behavior Pattern Snapshot" subtitle="Recent trigger frequency and mental-game trend." />
            {summary.topTriggers.length === 0 ? (
              <p className="text-sm text-ink-700">Log a few sessions to see common trigger patterns.</p>
            ) : (
              <div className="space-y-2">
                {summary.topTriggers.map(([trigger, count]) => (
                  <div key={trigger} className="flex items-center justify-between rounded-lg border border-ink-200 bg-white px-3 py-2">
                    <p className="text-sm font-semibold text-ink-900">{trigger}</p>
                    <span className="text-xs text-ink-700">{count}x</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent Logs" subtitle="Last 10 psychology entries." />
            <div className="space-y-2">
              {recentEntries.slice(0, 10).map((item) => (
                <button
                  key={item.date}
                  type="button"
                  onClick={() => setSelectedDate(item.date)}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-left hover:bg-ink-100/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">{item.date}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-ink-700">
                      <Gauge className="h-3.5 w-3.5" />
                      {item.disciplineScore ?? "-"} / {item.tiltLevel ?? "-"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-ink-700">
                    {item.postMarketEmotion || item.preMarketEmotion || item.notes || "No notes logged"}
                  </p>
                </button>
              ))}
              {recentEntries.length === 0 && <p className="text-sm text-ink-700">No psychology logs yet.</p>}
            </div>
            <div className="mt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEntriesMap((current) => ({
                    ...current,
                    [todayKey()]: current[todayKey()] ?? emptyEntry(todayKey())
                  }));
                  setSelectedDate(todayKey());
                }}
              >
                Jump to today
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
