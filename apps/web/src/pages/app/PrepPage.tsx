import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { ArrowRightLeft, CalendarDays, CheckCircle2, ClipboardCheck, Newspaper } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

interface PrepDayRecord {
  date: string;
  watchlist: string;
  keyLevels: string;
  marketBias: string;
  invalidation: string;
  ifThenPlan: string;
  sessionGoal: string;
  eventNotes: string;
  postMarketReview: string;
  checklist: {
    levelsMapped: boolean;
    scenariosDefined: boolean;
    riskDefined: boolean;
    newsChecked: boolean;
    postReviewDone: boolean;
  };
  updatedAt: string;
}

type PrepMap = Record<string, PrepDayRecord>;

const STORAGE_KEY = "tradevera_prep_workspace_v1";

const emptyPrepRecord = (date: string): PrepDayRecord => ({
  date,
  watchlist: "",
  keyLevels: "",
  marketBias: "",
  invalidation: "",
  ifThenPlan: "",
  sessionGoal: "",
  eventNotes: "",
  postMarketReview: "",
  checklist: {
    levelsMapped: false,
    scenariosDefined: false,
    riskDefined: false,
    newsChecked: false,
    postReviewDone: false
  },
  updatedAt: new Date().toISOString()
});

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function ChecklistItem({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-3 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function PrepPage() {
  const [records, setRecords] = useLocalStorageState<PrepMap>(STORAGE_KEY, {});
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const key = dateKey(selectedDate);
  const record = records[key] ?? emptyPrepRecord(key);

  const completion = useMemo(() => {
    const values = Object.values(record.checklist);
    const done = values.filter(Boolean).length;
    return {
      done,
      total: values.length,
      percent: values.length === 0 ? 0 : Math.round((done / values.length) * 100)
    };
  }, [record.checklist]);

  const updateRecord = (patch: Partial<PrepDayRecord>) => {
    setRecords((current) => {
      const previous = current[key] ?? emptyPrepRecord(key);
      return {
        ...current,
        [key]: {
          ...previous,
          ...patch,
          updatedAt: new Date().toISOString()
        }
      };
    });
  };

  const updateChecklist = (field: keyof PrepDayRecord["checklist"], value: boolean) => {
    updateRecord({
      checklist: {
        ...record.checklist,
        [field]: value
      }
    });
  };

  const recentEntries = useMemo(() => {
    return Object.values(records)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
  }, [records]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Prep"
          subtitle="Replaces the old checklist with a full pre-market and post-market planning workspace."
          action={<span className="text-xs font-semibold text-ink-700">{completion.percent}% complete</span>}
        />

        <div className="grid gap-3 md:grid-cols-[220px,1fr]">
          <div className="space-y-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink-800">Prep date</span>
              <input
                type="date"
                value={key}
                onChange={(event) => setSelectedDate(new Date(`${event.target.value}T12:00:00`))}
                className="h-11 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
              />
            </label>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedDate((current) => addDays(current, -1))}>
                <ArrowRightLeft className="h-4 w-4 rotate-180" /> Prev
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setSelectedDate((current) => addDays(current, 1))}>
                <ArrowRightLeft className="h-4 w-4" /> Next
              </Button>
            </div>
            <div className="rounded-xl border border-ink-200 bg-ink-100/55 p-3 text-xs text-ink-800">
              <p className="inline-flex items-center gap-2 font-semibold text-ink-900">
                <CalendarDays className="h-4 w-4" />
                {format(selectedDate, "EEEE, MMM d")}
              </p>
              <p className="mt-1">Autosaves locally in this browser so prep is fast and frictionless.</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-4">
              <CardHeader title="Pre-Market Plan" subtitle="Define your intent before the bell." />
              <div className="space-y-3">
                <Input
                  label="Watchlist"
                  value={record.watchlist}
                  onChange={(event) => updateRecord({ watchlist: event.target.value })}
                  placeholder="NVDA, TSLA, SPY, NQ, ES"
                  hint="Comma-separated symbols."
                />
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-ink-800">Key levels / zones</span>
                  <textarea
                    value={record.keyLevels}
                    onChange={(event) => updateRecord({ keyLevels: event.target.value })}
                    rows={4}
                    placeholder="Premarket high/low, VWAP reclaim levels, liquidity pools..."
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-700/55 focus:border-ink-700 focus:ring-4 focus:ring-ink-200/70"
                  />
                </label>
                <Input
                  label="Market bias"
                  value={record.marketBias}
                  onChange={(event) => updateRecord({ marketBias: event.target.value })}
                  placeholder="Neutral -> bullish if opening drive holds above VWAP"
                />
                <Input
                  label="Invalidation"
                  value={record.invalidation}
                  onChange={(event) => updateRecord({ invalidation: event.target.value })}
                  placeholder="No trade if range stays choppy through 10:15 ET"
                />
                <Input
                  label="Session goal"
                  value={record.sessionGoal}
                  onChange={(event) => updateRecord({ sessionGoal: event.target.value })}
                  placeholder="A+ setups only. Max 3 executions. Protect mental capital."
                />
              </div>
            </Card>

            <Card className="p-4">
              <CardHeader title="Execution Scenarios" subtitle="Write the if/then rules you will follow." />
              <div className="space-y-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-ink-800">If / Then plan</span>
                  <textarea
                    value={record.ifThenPlan}
                    onChange={(event) => updateRecord({ ifThenPlan: event.target.value })}
                    rows={5}
                    placeholder={"If SPY reclaims VWAP with breadth confirmation, then look for first pullback long.\nIf CPI/FOMC day, reduce size and wait for first 15m range."}
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-700/55 focus:border-ink-700 focus:ring-4 focus:ring-ink-200/70"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink-800">
                    <Newspaper className="h-4 w-4" /> News / event notes
                  </span>
                  <textarea
                    value={record.eventNotes}
                    onChange={(event) => updateRecord({ eventNotes: event.target.value })}
                    rows={3}
                    placeholder="FOMC at 2:00 ET. No size until post-press conference trend confirms."
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-700/55 focus:border-ink-700 focus:ring-4 focus:ring-ink-200/70"
                  />
                </label>

                <div className="space-y-2">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-800">
                    <ClipboardCheck className="h-4 w-4" /> Prep checklist
                  </p>
                  <div className="grid gap-2">
                    <ChecklistItem
                      label="Mapped key levels and liquidity zones"
                      checked={record.checklist.levelsMapped}
                      onChange={(next) => updateChecklist("levelsMapped", next)}
                    />
                    <ChecklistItem
                      label="Defined scenarios and invalidations"
                      checked={record.checklist.scenariosDefined}
                      onChange={(next) => updateChecklist("scenariosDefined", next)}
                    />
                    <ChecklistItem
                      label="Defined risk and trade caps"
                      checked={record.checklist.riskDefined}
                      onChange={(next) => updateChecklist("riskDefined", next)}
                    />
                    <ChecklistItem
                      label="Checked macro / earnings events"
                      checked={record.checklist.newsChecked}
                      onChange={(next) => updateChecklist("newsChecked", next)}
                    />
                    <ChecklistItem
                      label="Completed post-market review"
                      checked={record.checklist.postReviewDone}
                      onChange={(next) => updateChecklist("postReviewDone", next)}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.3fr,0.7fr]">
        <Card>
          <CardHeader title="Post-Market Review" subtitle="Capture what actually happened and how you adapted." />
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink-800">Review notes</span>
            <textarea
              value={record.postMarketReview}
              onChange={(event) => updateRecord({ postMarketReview: event.target.value })}
              rows={7}
              placeholder="What worked, what failed, what to tighten tomorrow..."
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-700/55 focus:border-ink-700 focus:ring-4 focus:ring-ink-200/70"
            />
          </label>
          <p className="mt-3 text-xs text-ink-700">
            Last updated: {record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "Not saved yet"}
          </p>
        </Card>

        <Card>
          <CardHeader title="Recent Prep Sessions" subtitle="Quick access to your last 7 prep records." />
          <div className="space-y-2">
            {recentEntries.length === 0 ? (
              <p className="text-sm text-ink-700">No prep sessions yet. Start planning above.</p>
            ) : (
              recentEntries.map((item) => {
                const itemCompletion = Object.values(item.checklist).filter(Boolean).length;
                return (
                  <button
                    key={item.date}
                    type="button"
                    onClick={() => setSelectedDate(new Date(`${item.date}T12:00:00`))}
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-left hover:bg-ink-100/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink-900">{format(new Date(`${item.date}T12:00:00`), "EEE, MMM d")}</p>
                      <span className="text-xs text-ink-700">{itemCompletion}/5</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-ink-700">
                      {item.sessionGoal || item.marketBias || "No goal or bias logged yet."}
                    </p>
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-3 rounded-xl border border-mint-500/30 bg-mint-100/50 p-3 text-xs text-ink-900">
            <p className="inline-flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-mint-500" />
              Prep now replaces the old checklist templates
            </p>
            <p className="mt-1 text-ink-800">Use this page for daily planning and post-session process reviews.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
