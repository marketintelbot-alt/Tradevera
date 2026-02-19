import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Clock3, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface TimerState {
  mode: "idle" | "running" | "paused";
  durationSec: number;
  remainingSec: number;
  endsAt: number | null;
}

const STORAGE_KEY = "tradevera_focus_timer";
const DEFAULT_DURATION_MIN = 25;

function clampDurationSec(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_DURATION_MIN * 60;
  }
  return Math.max(60, Math.min(4 * 60 * 60, Math.floor(value)));
}

function defaultTimerState(): TimerState {
  const durationSec = DEFAULT_DURATION_MIN * 60;
  return {
    mode: "idle",
    durationSec,
    remainingSec: durationSec,
    endsAt: null
  };
}

function loadTimerState(): TimerState {
  if (typeof window === "undefined") {
    return defaultTimerState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultTimerState();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TimerState>;
    const durationSec = clampDurationSec(Number(parsed.durationSec));
    const remainingSec = clampDurationSec(Number(parsed.remainingSec));
    const mode = parsed.mode === "running" || parsed.mode === "paused" ? parsed.mode : "idle";
    const endsAt = mode === "running" && typeof parsed.endsAt === "number" ? parsed.endsAt : null;
    return {
      mode,
      durationSec,
      remainingSec: mode === "running" ? durationSec : remainingSec,
      endsAt
    };
  } catch {
    return defaultTimerState();
  }
}

function formatRemaining(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = String(Math.floor(safe / 60)).padStart(2, "0");
  const secs = String(safe % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function notifySessionComplete() {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return;
  }

  if (Notification.permission === "granted") {
    // Browser-level notification so it appears even when the tab is backgrounded.
    new Notification("Tradevera Focus Timer", {
      body: "Session complete. Review your execution and plan the next block."
    });
  }
}

export function FocusTimer() {
  const [open, setOpen] = useState(false);
  const [timerState, setTimerState] = useState<TimerState>(() => loadTimerState());
  const [customMinutes, setCustomMinutes] = useState("30");
  const [now, setNow] = useState(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const completedRunRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerState.mode !== "running") {
      return;
    }

    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [timerState.mode]);

  const remainingSec = useMemo(() => {
    if (timerState.mode !== "running" || timerState.endsAt === null) {
      return timerState.remainingSec;
    }
    return Math.max(0, Math.ceil((timerState.endsAt - now) / 1000));
  }, [now, timerState.endsAt, timerState.mode, timerState.remainingSec]);

  useEffect(() => {
    if (timerState.mode !== "running" || timerState.endsAt === null) {
      return;
    }
    if (remainingSec > 0) {
      return;
    }
    if (completedRunRef.current !== timerState.endsAt) {
      notifySessionComplete();
      completedRunRef.current = timerState.endsAt;
    }
    setTimerState((current) =>
      current.mode !== "running"
        ? current
        : {
            mode: "idle",
            durationSec: current.durationSec,
            remainingSec: current.durationSec,
            endsAt: null
          }
    );
  }, [remainingSec, timerState.endsAt, timerState.mode]);

  useEffect(() => {
    const payload: TimerState =
      timerState.mode === "running"
        ? {
            ...timerState,
            remainingSec
          }
        : timerState;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [remainingSec, timerState]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  const startWithDuration = (minutes: number) => {
    const durationSec = clampDurationSec(minutes * 60);
    const endsAt = Date.now() + durationSec * 1000;
    setTimerState({
      mode: "running",
      durationSec,
      remainingSec: durationSec,
      endsAt
    });
    setNow(Date.now());
  };

  const pauseTimer = () => {
    if (timerState.mode !== "running") {
      return;
    }
    setTimerState((current) => ({
      mode: "paused",
      durationSec: current.durationSec,
      remainingSec,
      endsAt: null
    }));
  };

  const resumeTimer = () => {
    if (timerState.mode !== "paused") {
      return;
    }
    const safeRemaining = clampDurationSec(timerState.remainingSec);
    const endsAt = Date.now() + safeRemaining * 1000;
    setTimerState({
      mode: "running",
      durationSec: timerState.durationSec,
      remainingSec: safeRemaining,
      endsAt
    });
    setNow(Date.now());
  };

  const resetTimer = () => {
    setTimerState((current) => ({
      mode: "idle",
      durationSec: current.durationSec,
      remainingSec: current.durationSec,
      endsAt: null
    }));
  };

  const requestAlerts = async () => {
    if (typeof Notification === "undefined") {
      return;
    }
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const isRunning = timerState.mode === "running";
  const isPaused = timerState.mode === "paused";
  const hasActiveSession = isRunning || isPaused;
  const triggerLabel = hasActiveSession ? formatRemaining(remainingSec) : "Focus Timer";

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="sm"
        className={cn("gap-2", hasActiveSession && "font-semibold")}
        onClick={() => setOpen((current) => !current)}
        title="Focus timer"
      >
        <Clock3 className="h-4 w-4" />
        <span className="hidden sm:inline">{triggerLabel}</span>
      </Button>

      {open ? (
        <div className="absolute right-0 top-12 z-40 w-[320px] rounded-xl border border-ink-200 bg-white p-4 shadow-panel">
          <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Focus Timer</p>
          <p className="mt-2 text-3xl font-semibold text-ink-900">{formatRemaining(remainingSec)}</p>
          <p className="mt-1 text-xs text-ink-700">
            {isRunning
              ? "Running now"
              : isPaused
                ? "Paused"
                : "Idle"}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => startWithDuration(25)}>
              25m
            </Button>
            <Button variant="secondary" size="sm" onClick={() => startWithDuration(50)}>
              50m
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => startWithDuration(Number(customMinutes))}
              disabled={!Number.isFinite(Number(customMinutes))}
            >
              Custom
            </Button>
          </div>

          <div className="mt-3">
            <label className="text-xs text-ink-700">Custom minutes</label>
            <input
              type="number"
              min={1}
              max={240}
              value={customMinutes}
              onChange={(event) => setCustomMinutes(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none transition focus:border-ink-700 focus:ring-4 focus:ring-ink-200/70"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {isRunning ? (
              <Button size="sm" onClick={pauseTimer} className="gap-2">
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            ) : (
              <Button size="sm" onClick={resumeTimer} className="gap-2" disabled={!isPaused}>
                <Play className="h-4 w-4" />
                Resume
              </Button>
            )}

            <Button variant="secondary" size="sm" onClick={resetTimer} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>

            <Button variant="ghost" size="sm" onClick={requestAlerts} className="gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
