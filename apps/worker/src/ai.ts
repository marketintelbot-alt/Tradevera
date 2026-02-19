import { aiCoachSchema } from "@tradevera/shared";
import type { Hono } from "hono";
import type { AppEnv } from "./types";
import { requireAuth } from "./auth";
import type { TradeRow } from "./utils/db";
import { nowIso } from "./utils/security";

const DEFAULT_LOOKBACK_DAYS = 60;
const MAX_TRADES = 600;
const RECENT_WINDOW = 12;

type SessionKey = "Asia" | "London" | "NY" | "Unknown";
type Intent = "risk" | "setup" | "session" | "discipline" | "growth" | "general";

interface SetupStats {
  pnl: number;
  trades: number;
  wins: number;
  grossProfit: number;
  grossLossAbs: number;
}

interface SessionStats {
  pnl: number;
  trades: number;
  wins: number;
}

interface SetupInsight {
  name: string;
  pnl: number;
  trades: number;
  winRate: number;
  profitFactor: number;
}

interface SessionInsight {
  name: SessionKey;
  pnl: number;
  trades: number;
  winRate: number;
}

function toNumber(value: number | null): number {
  return Number(value ?? 0);
}

function setupName(value: string | null): string {
  return value && value.trim().length > 0 ? value.trim() : "Unlabeled";
}

function sessionName(value: TradeRow["session"]): SessionKey {
  if (value === "Asia" || value === "London" || value === "NY") {
    return value;
  }
  return "Unknown";
}

function parseMistakes(value: string | null): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function percent(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return (part / total) * 100;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function chooseVariant<T>(seed: number, variants: readonly T[], offset = 0): T {
  const index = Math.abs(seed + offset * 131) % variants.length;
  return variants[index]!;
}

function formatMoney(value: number): string {
  const normalized = round(value);
  const sign = normalized > 0 ? "+" : normalized < 0 ? "-" : "";
  return `${sign}$${Math.abs(normalized).toFixed(2)}`;
}

function detectIntent(question: string | undefined): Intent {
  if (!question) {
    return "general";
  }

  const normalized = question.toLowerCase();

  if (/(risk|drawdown|loss|losing|max loss|stop|ruin)/.test(normalized)) {
    return "risk";
  }
  if (/(setup|pattern|entry|strategy|edge|trigger)/.test(normalized)) {
    return "setup";
  }
  if (/(session|time|timezone|london|asia|ny|open|close)/.test(normalized)) {
    return "session";
  }
  if (/(discipline|psychology|emotion|revenge|overtrade|adherence|confidence)/.test(normalized)) {
    return "discipline";
  }
  if (/(improve|better|next week|growth|review|plan)/.test(normalized)) {
    return "growth";
  }

  return "general";
}

function buildAnswer(params: {
  question: string | undefined;
  intent: Intent;
  lookbackDays: number;
  totalTrades: number;
  closedTrades: number;
  winRate: number;
  totalPnl: number;
  expectancy: number;
  profitFactor: number;
  maxDrawdown: number;
  avgLoss: number;
  bestSetup: string;
  weakestSetup: string;
  bestSession: string;
  weakestSession: string;
  topMistake: string | null;
  topMistakeCount: number;
  adherenceRate: number;
  recentTrades: number;
  recentWinRate: number;
  recentPnl: number;
}): string {
  if (params.closedTrades === 0) {
    return `Not enough closed trades in the last ${params.lookbackDays} days to generate a high-confidence coaching read. Close at least 10 trades with notes and mistake tags, then ask again for stronger guidance.`;
  }

  const seed = hashString(
    `${params.question ?? "no-question"}|${params.totalPnl}|${params.closedTrades}|${params.topMistake ?? "none"}|${Date.now()}`
  );

  const opening = chooseVariant(seed, [
    `Edge pulse: ${params.closedTrades} closed trades (${params.totalTrades} logged), ${params.winRate.toFixed(1)}% win rate, ${formatMoney(params.totalPnl)} net PnL, expectancy ${formatMoney(params.expectancy)} per trade.`,
    `Performance snapshot: ${formatMoney(params.totalPnl)} across ${params.closedTrades} closed trades with ${params.winRate.toFixed(1)}% win rate and ${params.profitFactor.toFixed(2)} profit factor.`,
    `Current read: win rate ${params.winRate.toFixed(1)}%, total PnL ${formatMoney(params.totalPnl)}, and drawdown contained to ${formatMoney(-params.maxDrawdown)}.`
  ]);

  const recentLine =
    params.recentTrades > 0
      ? `Recent form (${params.recentTrades} trades): ${params.recentWinRate.toFixed(1)}% win rate, ${formatMoney(params.recentPnl)} net.`
      : "Recent form is unavailable because there are no recently closed trades.";

  const intentLine = (() => {
    switch (params.intent) {
      case "risk":
        return chooseVariant(
          seed,
          [
            `Risk lens: average losing trade is ${formatMoney(params.avgLoss)} and max drawdown is ${formatMoney(-params.maxDrawdown)}. Keep full size around ${params.bestSetup} and trim risk in ${params.weakestSession}.`,
            `Capital protection focus: drawdown is ${formatMoney(-params.maxDrawdown)} with average loss around ${formatMoney(params.avgLoss)}. Prioritize ${params.bestSession} trades and avoid forcing entries in ${params.weakestSession}.`,
            `Risk control read: your edge holds best in ${params.bestSession}; reduce exposure when trading ${params.weakestSession} and hard-cap daily downside before revenge risk appears.`
          ],
          1
        );

      case "setup":
        return chooseVariant(
          seed,
          [
            `Setup lens: ${params.bestSetup} is your strongest edge while ${params.weakestSetup} is lagging. Route most risk into ${params.bestSetup} until ${params.weakestSetup} re-earns size.`,
            `Pattern focus: build your week around ${params.bestSetup} and treat ${params.weakestSetup} as probationary with reduced size and stricter confirmation.`,
            `Execution edge: ${params.bestSetup} should be your A-book setup; either refine or pause ${params.weakestSetup} until quality improves.`
          ],
          2
        );

      case "session":
        return chooseVariant(
          seed,
          [
            `Session lens: ${params.bestSession} is producing the cleanest edge and ${params.weakestSession} is leaking performance. Trade smaller and more selective during ${params.weakestSession}.`,
            `Time-of-day read: keep your highest conviction risk in ${params.bestSession}, and use a stricter checklist in ${params.weakestSession}.`,
            `Session performance suggests a split approach: aggressive only in ${params.bestSession}, defensive posture in ${params.weakestSession}.`
          ],
          3
        );

      case "discipline":
        return chooseVariant(
          seed,
          [
            `Discipline lens: plan adherence is ${params.adherenceRate.toFixed(1)}%. ${
              params.topMistake ? `Main leak is "${params.topMistake}".` : "No repeated mistake tag yet."
            } Make process compliance your lead KPI this week.`,
            `Process read: adherence sits at ${params.adherenceRate.toFixed(1)}% and ${
              params.topMistake ? `"${params.topMistake}" appears most often.` : "mistake tags are sparse."
            } Tighten pre-trade pause and post-trade note quality.`,
            `Behavioral edge: consistency is currently ${params.adherenceRate.toFixed(1)}%. ${
              params.topMistake
                ? `Eliminate "${params.topMistake}" first.`
                : "Log mistakes more explicitly to expose leaks faster."
            }`
          ],
          4
        );

      case "growth":
        return chooseVariant(
          seed,
          [
            `Growth focus: keep compounding ${params.bestSetup}, protect downside around ${params.weakestSetup}, and use weekly scorecards to drive one measurable improvement at a time.`,
            `Improvement plan: build around ${params.bestSetup}, audit ${params.weakestSetup}, and keep risk asymmetric by concentrating size where your data is strongest.`,
            `Scale plan: increase reps in ${params.bestSetup}, tighten filters in ${params.weakestSetup}, and track adherence daily to keep variance controlled.`
          ],
          5
        );

      case "general":
      default:
        return chooseVariant(
          seed,
          [
            `Primary edge sits in ${params.bestSetup} and ${params.bestSession}. Keep pressure there while reducing exposure around ${params.weakestSetup}/${params.weakestSession}.`,
            `Your strongest read is ${params.bestSetup} in ${params.bestSession}. Reduce discretionary trades in weaker contexts to improve expectancy.`,
            `Data says lean into ${params.bestSetup} and avoid forcing trades in weaker windows like ${params.weakestSession}.`
          ],
          6
        );
    }
  })();

  const actionLine = chooseVariant(
    seed,
    [
      `Next actions: (1) Keep full risk for ${params.bestSetup} only. (2) Cut size in ${params.weakestSession}. (3) ${params.topMistake ? `Zero-tolerance rule for "${params.topMistake}" this week.` : "Log one mistake tag on every losing trade."}`,
      `Execution plan: (1) Pre-trade checklist before every entry. (2) Prioritize ${params.bestSetup}. (3) ${params.topMistake ? `Review every "${params.topMistake}" trade end-of-day.` : "Run end-of-day review with one adjustment rule."}`,
      `Playbook for the next 5 sessions: (1) Trade your A-setups first. (2) Defend against drawdown past ${formatMoney(-params.maxDrawdown)}. (3) ${params.topMistake ? `Track and eliminate "${params.topMistake}" occurrences (${params.topMistakeCount} logged).` : "Tag mistakes in real time to expose hidden leaks."}`
    ],
    7
  );

  return `${opening} ${recentLine} ${intentLine} ${actionLine}`;
}

export function registerAiRoutes(app: Hono<AppEnv>) {
  app.post("/api/ai/coach", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    if (auth.plan !== "pro") {
      return c.json({ error: "AI Assistant is a Pro feature. Upgrade to unlock it." }, 403);
    }

    const payload = await c.req.json().catch(() => ({}));
    const parsed = aiCoachSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ error: "Invalid assistant request", details: parsed.error.flatten() }, 400);
    }

    const lookbackDays = Number(parsed.data.lookbackDays ?? DEFAULT_LOOKBACK_DAYS);
    const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    const rows = await c.env.DB
      .prepare("SELECT * FROM trades WHERE user_id = ? AND opened_at >= ? ORDER BY opened_at DESC LIMIT ?")
      .bind(auth.id, cutoff, MAX_TRADES)
      .all<TradeRow>();

    const trades = rows.results ?? [];
    const closedTrades = trades.filter((trade) => trade.pnl !== null);
    const wins = closedTrades.filter((trade) => toNumber(trade.pnl) > 0);
    const losses = closedTrades.filter((trade) => toNumber(trade.pnl) < 0);

    const totalPnl = round(closedTrades.reduce((sum, trade) => sum + toNumber(trade.pnl), 0));
    const winRate = percent(wins.length, closedTrades.length);
    const avgWin = wins.length === 0 ? 0 : round(wins.reduce((sum, trade) => sum + toNumber(trade.pnl), 0) / wins.length);
    const avgLoss = losses.length === 0 ? 0 : round(losses.reduce((sum, trade) => sum + toNumber(trade.pnl), 0) / losses.length);
    const grossProfit = round(wins.reduce((sum, trade) => sum + toNumber(trade.pnl), 0));
    const grossLossAbs = round(Math.abs(losses.reduce((sum, trade) => sum + toNumber(trade.pnl), 0)));
    const profitFactor = grossLossAbs === 0 ? (grossProfit > 0 ? grossProfit : 0) : round(grossProfit / grossLossAbs);
    const expectancy = closedTrades.length === 0 ? 0 : round(totalPnl / closedTrades.length);

    const setupMap = new Map<string, SetupStats>();
    const sessionMap = new Map<SessionKey, SessionStats>();
    const mistakeMap = new Map<string, number>();

    for (const trade of closedTrades) {
      const pnl = toNumber(trade.pnl);
      const setup = setupName(trade.setup);
      const setupStats = setupMap.get(setup) ?? { pnl: 0, trades: 0, wins: 0, grossProfit: 0, grossLossAbs: 0 };
      setupStats.pnl += pnl;
      setupStats.trades += 1;
      if (pnl > 0) {
        setupStats.wins += 1;
        setupStats.grossProfit += pnl;
      } else if (pnl < 0) {
        setupStats.grossLossAbs += Math.abs(pnl);
      }
      setupMap.set(setup, setupStats);

      const session = sessionName(trade.session);
      const sessionStats = sessionMap.get(session) ?? { pnl: 0, trades: 0, wins: 0 };
      sessionStats.pnl += pnl;
      sessionStats.trades += 1;
      if (pnl > 0) {
        sessionStats.wins += 1;
      }
      sessionMap.set(session, sessionStats);
    }

    for (const trade of trades) {
      for (const mistake of parseMistakes(trade.mistakes)) {
        mistakeMap.set(mistake, (mistakeMap.get(mistake) ?? 0) + 1);
      }
    }

    const adherenceRate =
      trades.length === 0 ? 0 : percent(trades.filter((trade) => Number(trade.plan_adherence) === 1).length, trades.length);

    const setupInsights: SetupInsight[] = Array.from(setupMap.entries())
      .map(([name, stats]) => ({
        name,
        pnl: round(stats.pnl),
        trades: stats.trades,
        winRate: round(percent(stats.wins, stats.trades)),
        profitFactor: stats.grossLossAbs === 0 ? round(stats.grossProfit) : round(stats.grossProfit / stats.grossLossAbs)
      }))
      .sort((a, b) => b.pnl - a.pnl);

    const sessionInsights: SessionInsight[] = Array.from(sessionMap.entries())
      .map(([name, stats]) => ({
        name,
        pnl: round(stats.pnl),
        trades: stats.trades,
        winRate: round(percent(stats.wins, stats.trades))
      }))
      .sort((a, b) => b.pnl - a.pnl);

    const topMistakes = Array.from(mistakeMap.entries()).sort((a, b) => b[1] - a[1]);

    const bestSetup = setupInsights.at(0)?.name ?? "N/A";
    const weakestSetup = setupInsights.at(-1)?.name ?? "N/A";
    const bestSession = sessionInsights.at(0)?.name ?? "N/A";
    const weakestSession = sessionInsights.at(-1)?.name ?? "N/A";
    const topMistake = topMistakes[0]?.[0] ?? null;
    const topMistakeCount = topMistakes[0]?.[1] ?? 0;

    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;

    const chronologicalClosed = [...closedTrades].sort(
      (a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime()
    );

    for (const trade of chronologicalClosed) {
      equity += toNumber(trade.pnl);
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
    }

    const recentClosed = closedTrades.slice(0, RECENT_WINDOW);
    const recentWins = recentClosed.filter((trade) => toNumber(trade.pnl) > 0).length;
    const recentWinRate = round(percent(recentWins, recentClosed.length));
    const recentPnl = round(recentClosed.reduce((sum, trade) => sum + toNumber(trade.pnl), 0));

    const intent = detectIntent(parsed.data.question);

    const whatWorked: string[] = [];
    const whatToImprove: string[] = [];
    const actionItems: string[] = [];

    const topSetup = setupInsights.at(0);
    const weakSetup = setupInsights.at(-1);
    const topSession = sessionInsights.at(0);
    const weakSession = sessionInsights.at(-1);

    if (topSetup) {
      whatWorked.push(
        `${topSetup.name} leads with ${formatMoney(topSetup.pnl)} across ${topSetup.trades} trades (${topSetup.winRate.toFixed(1)}% win rate).`
      );
    }

    if (topSession) {
      whatWorked.push(
        `Strongest session is ${topSession.name} at ${topSession.winRate.toFixed(1)}% win rate and ${formatMoney(topSession.pnl)} net.`
      );
    }

    if (adherenceRate >= 80) {
      whatWorked.push(`Plan adherence is ${adherenceRate.toFixed(1)}%, indicating strong execution discipline.`);
    }

    if (recentClosed.length > 0 && recentPnl > 0) {
      whatWorked.push(`Recent momentum is positive: ${formatMoney(recentPnl)} over the last ${recentClosed.length} closed trades.`);
    }

    if (topMistake) {
      whatToImprove.push(`Most common mistake is "${topMistake}" (${topMistakeCount} tags).`);
    }

    if (weakSetup && weakSetup.name !== bestSetup) {
      whatToImprove.push(
        `Weakest setup is ${weakSetup.name} with ${formatMoney(weakSetup.pnl)}; tighten criteria before restoring full size.`
      );
    }

    if (weakSession && weakSession.name !== bestSession) {
      whatToImprove.push(
        `${weakSession.name} session is underperforming at ${weakSession.winRate.toFixed(1)}% win rate; reduce discretionary trades there.`
      );
    }

    if (adherenceRate < 80) {
      whatToImprove.push(`Plan adherence is ${adherenceRate.toFixed(1)}%; consistency needs improvement.`);
    }

    if (topMistake) {
      actionItems.push(`Before each entry, run a 20-second checklist to avoid "${topMistake}".`);
    }

    if (bestSetup !== "N/A" && weakSetup?.name !== bestSetup) {
      actionItems.push(`Prioritize ${bestSetup} setups and cut ${weakSetup?.name ?? "B/C"} setup risk until it stabilizes.`);
    }

    if (weakSession && topSession && weakSession.name !== topSession.name) {
      actionItems.push(`Run normal risk in ${topSession.name}; trade half-size with stricter filters in ${weakSession.name}.`);
    }

    if (actionItems.length < 3) {
      actionItems.push("Set and respect a hard daily max-loss limit before the session opens.");
    }

    const answer = buildAnswer({
      question: parsed.data.question,
      intent,
      lookbackDays,
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      winRate,
      totalPnl,
      expectancy,
      profitFactor,
      maxDrawdown: round(maxDrawdown),
      avgLoss,
      bestSetup,
      weakestSetup,
      bestSession,
      weakestSession,
      topMistake,
      topMistakeCount,
      adherenceRate: round(adherenceRate),
      recentTrades: recentClosed.length,
      recentWinRate,
      recentPnl
    });

    return c.json({
      generatedAt: nowIso(),
      lookbackDays,
      headline: "Tradevera Pro AI Coach",
      answer,
      snapshot: {
        totalTrades: trades.length,
        closedTrades: closedTrades.length,
        winRate: round(winRate),
        totalPnl,
        avgWin,
        avgLoss,
        bestSetup,
        weakestSetup,
        adherenceRate: round(adherenceRate)
      },
      whatWorked: whatWorked.slice(0, 3),
      whatToImprove: whatToImprove.slice(0, 3),
      actionItems: actionItems.slice(0, 3)
    });
  });
}
