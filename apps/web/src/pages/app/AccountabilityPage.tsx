import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Project, Task } from "@tradevera/shared";
import { CheckCircle2, ClipboardList, Flame, Target } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/common/ToastProvider";
import { api } from "@/lib/api";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { useAuth } from "@/context/AuthContext";

interface AccountabilityDay {
  date: string;
  scorecard: {
    followedPlan: boolean;
    respectedRisk: boolean;
    journaledTrades: boolean;
    completedPrep: boolean;
    stoppedWhenOff: boolean;
  };
  reflection: string;
  tomorrowCommitment: string;
  updatedAt: string;
}

interface AccountabilityState {
  weeklyGoals: string[];
  days: Record<string, AccountabilityDay>;
}

const STORAGE_KEY = "tradevera_accountability_v1";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function emptyDay(date: string): AccountabilityDay {
  return {
    date,
    scorecard: {
      followedPlan: false,
      respectedRisk: false,
      journaledTrades: false,
      completedPrep: false,
      stoppedWhenOff: false
    },
    reflection: "",
    tomorrowCommitment: "",
    updatedAt: new Date().toISOString()
  };
}

function ScoreToggle({
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
      {label}
    </label>
  );
}

export function AccountabilityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [state, setState] = useLocalStorageState<AccountabilityState>(STORAGE_KEY, {
    weeklyGoals: ["", "", ""],
    days: {}
  });

  const day = state.days[selectedDate] ?? emptyDay(selectedDate);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setWorkspaceLoading(true);
      try {
        const [projectRes, taskRes] = await Promise.all([api.listProjects(), api.listTasks()]);
        if (!mounted) {
          return;
        }
        setProjects(projectRes.projects);
        setTasks(taskRes.tasks);
      } catch (error) {
        toast({
          title: "Unable to load task workspace",
          description: error instanceof Error ? error.message : "Unexpected error",
          tone: "error"
        });
      } finally {
        if (mounted) {
          setWorkspaceLoading(false);
        }
      }
    };
    load().catch((error) => console.error(error));
    return () => {
      mounted = false;
    };
  }, [toast]);

  const updateDay = (patch: Partial<AccountabilityDay>) => {
    setState((current) => ({
      ...current,
      days: {
        ...current.days,
        [selectedDate]: {
          ...(current.days[selectedDate] ?? emptyDay(selectedDate)),
          ...patch,
          updatedAt: new Date().toISOString()
        }
      }
    }));
  };

  const updateScore = (field: keyof AccountabilityDay["scorecard"], value: boolean) => {
    updateDay({
      scorecard: {
        ...day.scorecard,
        [field]: value
      }
    });
  };

  const scoreSummary = useMemo(() => {
    const entries = Object.values(state.days).sort((a, b) => b.date.localeCompare(a.date));
    const recent = entries.slice(0, 30);
    const calcPercent = (item: AccountabilityDay) => {
      const values = Object.values(item.scorecard);
      return Math.round((values.filter(Boolean).length / values.length) * 100);
    };
    const average = recent.length === 0 ? 0 : Math.round(recent.reduce((sum, item) => sum + calcPercent(item), 0) / recent.length);

    let streak = 0;
    for (const item of entries) {
      if (calcPercent(item) >= 80) {
        streak += 1;
      } else {
        break;
      }
    }

    return { average, streak, entries };
  }, [state.days]);

  const workspaceSummary = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== "done").length;
    const inProgress = tasks.filter((task) => task.status === "in_progress").length;
    const activeProjects = projects.filter((project) => project.status === "active").length;
    return { openTasks, inProgress, activeProjects };
  }, [projects, tasks]);

  const todayScorePercent = Math.round((Object.values(day.scorecard).filter(Boolean).length / Object.values(day.scorecard).length) * 100);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Accountability" subtitle="Daily scorecards, weekly commitments, and execution follow-through." />
        <p className="text-sm text-ink-700">
          Available across all plans. Pair this with Projects & Tasks to run your process like a trading business.
          {user?.plan === "free" ? " Starter and Pro are ad-free while keeping the same accountability workflows." : ""}
        </p>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Today score</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{todayScorePercent}%</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-700">30-day avg</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{scoreSummary.average}%</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-700">80%+ streak</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-semibold text-ink-900">
            <Flame className="h-5 w-5 text-amber-500" />
            {scoreSummary.streak}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Task workspace</p>
          <p className="mt-2 text-sm font-semibold text-ink-900">
            {workspaceLoading ? "Loading..." : `${workspaceSummary.openTasks} open / ${workspaceSummary.activeProjects} active projects`}
          </p>
        </Card>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <Card>
          <CardHeader
            title="Daily Accountability Scorecard"
            subtitle="Track process adherence daily, not just PnL."
            action={
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
              />
            }
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <ScoreToggle label="Followed written plan" checked={day.scorecard.followedPlan} onChange={(next) => updateScore("followedPlan", next)} />
            <ScoreToggle label="Respected risk limits" checked={day.scorecard.respectedRisk} onChange={(next) => updateScore("respectedRisk", next)} />
            <ScoreToggle label="Completed trade journal" checked={day.scorecard.journaledTrades} onChange={(next) => updateScore("journaledTrades", next)} />
            <ScoreToggle label="Completed Prep workflow" checked={day.scorecard.completedPrep} onChange={(next) => updateScore("completedPrep", next)} />
            <ScoreToggle label="Stopped when off-plan / tilted" checked={day.scorecard.stoppedWhenOff} onChange={(next) => updateScore("stoppedWhenOff", next)} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink-800">Reflection</span>
              <textarea
                rows={4}
                value={day.reflection}
                onChange={(event) => updateDay({ reflection: event.target.value })}
                placeholder="What did I execute well? Where did I drift?"
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-700/55 focus:border-ink-700 focus:ring-4 focus:ring-ink-200/70"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink-800">Commitment for tomorrow</span>
              <textarea
                rows={4}
                value={day.tomorrowCommitment}
                onChange={(event) => updateDay({ tomorrowCommitment: event.target.value })}
                placeholder="One clear process commitment for next session."
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-700/55 focus:border-ink-700 focus:ring-4 focus:ring-ink-200/70"
              />
            </label>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Weekly Commitments" subtitle="3 non-negotiables for the current week." />
            <div className="space-y-3">
              {state.weeklyGoals.map((goal, index) => (
                <Input
                  key={index}
                  label={`Commitment ${index + 1}`}
                  value={goal}
                  onChange={(event) =>
                    setState((current) => {
                      const nextGoals = [...current.weeklyGoals];
                      nextGoals[index] = event.target.value;
                      return { ...current, weeklyGoals: nextGoals };
                    })
                  }
                  placeholder={index === 0 ? "Only take A+ setups before 11:00 ET" : "Write a measurable process commitment"}
                />
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Projects & Tasks Command Center" subtitle="Use this with Accountability for full process execution." />
            <div className="space-y-2 text-sm text-ink-800">
              <p className="inline-flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Open tasks: <strong>{workspaceLoading ? "-" : workspaceSummary.openTasks}</strong>
              </p>
              <p className="inline-flex items-center gap-2">
                <Target className="h-4 w-4" /> In progress: <strong>{workspaceLoading ? "-" : workspaceSummary.inProgress}</strong>
              </p>
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Active projects: <strong>{workspaceLoading ? "-" : workspaceSummary.activeProjects}</strong>
              </p>
            </div>
            <div className="mt-3">
              <Link to="/app/projects">
                <Button variant="secondary" className="w-full">Open Projects & Tasks</Button>
              </Link>
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent Scorecards" subtitle="Quick scan of your recent process quality." />
            <div className="space-y-2">
              {scoreSummary.entries.slice(0, 8).map((item) => {
                const values = Object.values(item.scorecard);
                const percent = Math.round((values.filter(Boolean).length / values.length) * 100);
                return (
                  <button
                    key={item.date}
                    type="button"
                    onClick={() => setSelectedDate(item.date)}
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-left hover:bg-ink-100/60"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink-900">{item.date}</p>
                      <span className="text-xs text-ink-700">{percent}%</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-ink-700">
                      {item.tomorrowCommitment || item.reflection || "No notes yet"}
                    </p>
                  </button>
                );
              })}
              {scoreSummary.entries.length === 0 && <p className="text-sm text-ink-700">No scorecards yet.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
