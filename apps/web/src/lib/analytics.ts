import { endOfWeek, format, startOfWeek } from "date-fns";
import type { Trade, WeeklyReview } from "@tradevera/shared";

export interface CoreAnalytics {
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  bestSetup: string;
  worstSetup: string;
  longestWinStreak: number;
  longestLossStreak: number;
}

export interface ProAnalytics {
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  equityCurve: Array<{ date: string; equity: number }>;
  rDistribution: Array<{ bucket: string; count: number }>;
  pnlBySession: Array<{ session: string; pnl: number }>;
  setupPerformance: Array<{ setup: string; trades: number; winRate: number; pnl: number }>;
  rollingWinRate: Array<{ index: number; winRate: number }>;
}

function numericPnl(trade: Trade): number {
  return Number(trade.pnl ?? 0);
}

function setupName(value: string | null): string {
  return value && value.trim().length > 0 ? value : "Unlabeled";
}

export function computeCoreAnalytics(trades: Trade[]): CoreAnalytics {
  if (trades.length === 0) {
    return {
      winRate: 0,
      totalPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      bestSetup: "N/A",
      worstSetup: "N/A",
      longestWinStreak: 0,
      longestLossStreak: 0
    };
  }

  const closedTrades = trades.filter((trade) => trade.pnl !== null);
  const wins = closedTrades.filter((trade) => numericPnl(trade) > 0);
  const losses = closedTrades.filter((trade) => numericPnl(trade) < 0);

  const setupMap = new Map<string, { pnl: number; count: number }>();
  let totalPnl = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;

  for (const trade of trades.slice().sort((a, b) => a.opened_at.localeCompare(b.opened_at))) {
    const pnl = numericPnl(trade);
    totalPnl += pnl;

    const name = setupName(trade.setup);
    const setupStats = setupMap.get(name) ?? { pnl: 0, count: 0 };
    setupStats.pnl += pnl;
    setupStats.count += 1;
    setupMap.set(name, setupStats);

    if (pnl > 0) {
      currentWinStreak += 1;
      currentLossStreak = 0;
    } else if (pnl < 0) {
      currentLossStreak += 1;
      currentWinStreak = 0;
    }

    longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
  }

  const setupPerformance = Array.from(setupMap.entries()).map(([setup, stats]) => ({
    setup,
    avgPnl: stats.pnl / stats.count
  }));

  setupPerformance.sort((a, b) => b.avgPnl - a.avgPnl);

  return {
    winRate: closedTrades.length === 0 ? 0 : (wins.length / closedTrades.length) * 100,
    totalPnl,
    avgWin: wins.length === 0 ? 0 : wins.reduce((sum, trade) => sum + numericPnl(trade), 0) / wins.length,
    avgLoss: losses.length === 0 ? 0 : losses.reduce((sum, trade) => sum + numericPnl(trade), 0) / losses.length,
    bestSetup: setupPerformance[0]?.setup ?? "N/A",
    worstSetup: setupPerformance[setupPerformance.length - 1]?.setup ?? "N/A",
    longestWinStreak,
    longestLossStreak
  };
}

export function computeProAnalytics(trades: Trade[]): ProAnalytics {
  const closedTrades = trades
    .filter((trade) => trade.pnl !== null)
    .slice()
    .sort((a, b) => a.opened_at.localeCompare(b.opened_at));

  if (closedTrades.length === 0) {
    return {
      profitFactor: 0,
      expectancy: 0,
      maxDrawdown: 0,
      equityCurve: [],
      rDistribution: [],
      pnlBySession: [],
      setupPerformance: [],
      rollingWinRate: []
    };
  }

  const grossProfit = closedTrades.filter((t) => numericPnl(t) > 0).reduce((acc, t) => acc + numericPnl(t), 0);
  const grossLoss = Math.abs(closedTrades.filter((t) => numericPnl(t) < 0).reduce((acc, t) => acc + numericPnl(t), 0));

  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  const equityCurve = closedTrades.map((trade) => {
    equity += numericPnl(trade);
    peak = Math.max(peak, equity);
    const drawdown = peak - equity;
    maxDrawdown = Math.max(maxDrawdown, drawdown);

    return {
      date: format(new Date(trade.opened_at), "MMM d"),
      equity
    };
  });

  const sessionMap = new Map<string, number>();
  closedTrades.forEach((trade) => {
    const key = trade.session ?? "Unknown";
    sessionMap.set(key, (sessionMap.get(key) ?? 0) + numericPnl(trade));
  });

  const setupMap = new Map<string, { wins: number; trades: number; pnl: number }>();
  closedTrades.forEach((trade) => {
    const key = setupName(trade.setup);
    const record = setupMap.get(key) ?? { wins: 0, trades: 0, pnl: 0 };
    record.trades += 1;
    record.pnl += numericPnl(trade);
    if (numericPnl(trade) > 0) {
      record.wins += 1;
    }
    setupMap.set(key, record);
  });

  const rollingWindow = 20;
  const rollingWinRate: Array<{ index: number; winRate: number }> = [];
  for (let i = 0; i < closedTrades.length; i += 1) {
    const start = Math.max(0, i - rollingWindow + 1);
    const sample = closedTrades.slice(start, i + 1);
    const wins = sample.filter((trade) => numericPnl(trade) > 0).length;
    rollingWinRate.push({
      index: i + 1,
      winRate: (wins / sample.length) * 100
    });
  }

  const rDistributionBuckets = [
    { label: "<= -2R", test: (value: number) => value <= -2 },
    { label: "-2R to 0R", test: (value: number) => value > -2 && value <= 0 },
    { label: "0R to 1R", test: (value: number) => value > 0 && value <= 1 },
    { label: "1R to 2R", test: (value: number) => value > 1 && value <= 2 },
    { label: "> 2R", test: (value: number) => value > 2 }
  ];

  const rDistribution = rDistributionBuckets.map((bucket) => ({
    bucket: bucket.label,
    count: closedTrades.filter((trade) => {
      if (trade.r_multiple === null) {
        return false;
      }
      return bucket.test(Number(trade.r_multiple));
    }).length
  }));

  return {
    profitFactor: grossLoss === 0 ? grossProfit : grossProfit / grossLoss,
    expectancy: closedTrades.reduce((acc, trade) => acc + numericPnl(trade), 0) / closedTrades.length,
    maxDrawdown,
    equityCurve,
    rDistribution,
    pnlBySession: Array.from(sessionMap.entries()).map(([session, pnl]) => ({ session, pnl })),
    setupPerformance: Array.from(setupMap.entries())
      .map(([setup, record]) => ({
        setup,
        trades: record.trades,
        winRate: (record.wins / record.trades) * 100,
        pnl: record.pnl
      }))
      .sort((a, b) => b.pnl - a.pnl),
    rollingWinRate
  };
}

export function computeWeeklyReview(trades: Trade[], weekDate = new Date()): WeeklyReview {
  const start = startOfWeek(weekDate, { weekStartsOn: 1 });
  const end = endOfWeek(weekDate, { weekStartsOn: 1 });

  const weekTrades = trades.filter((trade) => {
    const openedAt = new Date(trade.opened_at);
    return openedAt >= start && openedAt <= end;
  });

  const closedTrades = weekTrades.filter((trade) => trade.pnl !== null);
  const wins = closedTrades.filter((trade) => numericPnl(trade) > 0);

  const setupScore = new Map<string, number>();
  const mistakeCount = new Map<string, number>();

  weekTrades.forEach((trade) => {
    const setup = setupName(trade.setup);
    setupScore.set(setup, (setupScore.get(setup) ?? 0) + numericPnl(trade));

    if (trade.mistakes) {
      trade.mistakes
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean)
        .forEach((mistake) => {
          mistakeCount.set(mistake, (mistakeCount.get(mistake) ?? 0) + 1);
        });
    }
  });

  const topSetups = Array.from(setupScore.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const commonMistakes = Array.from(mistakeCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const actionItems: string[] = [];
  if (commonMistakes.length > 0) {
    actionItems.push(`Reduce ${commonMistakes[0]} with a pre-trade checklist pause.`);
  }
  if (topSetups.length > 0) {
    actionItems.push(`Focus execution on ${topSetups[0]} setup during high-liquidity windows.`);
  }

  const adherenceRate = weekTrades.length
    ? (weekTrades.filter((trade) => Boolean(trade.plan_adherence)).length / weekTrades.length) * 100
    : 0;
  actionItems.push(
    adherenceRate < 80
      ? "Raise plan adherence above 80% by defining invalidation before entry."
      : "Maintain discipline with the same risk unit and session boundaries."
  );

  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    totalTrades: weekTrades.length,
    winRate: closedTrades.length === 0 ? 0 : (wins.length / closedTrades.length) * 100,
    topSetups,
    commonMistakes,
    actionItems: actionItems.slice(0, 3)
  };
}
