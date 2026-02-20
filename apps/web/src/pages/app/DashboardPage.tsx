import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AdSlot } from "@/components/ads/AdSlot";
import { LockedPanel } from "@/components/common/LockedPanel";
import { MetricTile } from "@/components/charts/MetricTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useTrades } from "@/hooks/useTrades";
import { computeCoreAnalytics, computeProAnalytics } from "@/lib/analytics";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trades, loading } = useTrades();

  const core = useMemo(() => computeCoreAnalytics(trades), [trades]);
  const pro = useMemo(() => computeProAnalytics(trades), [trades]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <MetricTile label="Total PnL" value={formatCurrency(core.totalPnl)} caption="Net of fees" />
        <MetricTile label="Win Rate" value={formatPercent(core.winRate)} caption="Closed trades only" />
        <MetricTile label="Avg Win / Loss" value={`${formatCurrency(core.avgWin)} / ${formatCurrency(core.avgLoss)}`} />
        <MetricTile label="Best Setup" value={core.bestSetup} />
        <MetricTile label="Worst Setup" value={core.worstSetup} />
        <MetricTile label="Streaks" value={`${core.longestWinStreak}W / ${core.longestLossStreak}L`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr,300px]">
        <Card>
          <CardHeader title="Equity Curve" subtitle="Cumulative performance over time" />
          {pro.equityCurve.length === 0 ? (
            <p className="text-sm text-ink-700">Add closed trades to see your curve.</p>
          ) : (
            <div className="h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pro.equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5ECF7" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="equity" stroke="#2CD5A4" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {user?.plan === "free" ? (
          <div className="space-y-3">
            <AdSlot placement="dashboard" />
            <Card>
              <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Free usage</p>
              <p className="mt-2 text-2xl font-semibold text-ink-900">
                {user.tradeCount}/{user.tradeLimit}
              </p>
              <p className="text-xs text-ink-700">
                {user.freeDaysRemaining !== null
                  ? `${user.freeDaysRemaining} day${user.freeDaysRemaining === 1 ? "" : "s"} left on Free.`
                  : "Upgrade to unlock unlimited cloud-synced trades."}
              </p>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader
              title={user?.plan === "starter" ? "Starter snapshot" : "Pro snapshot"}
              subtitle={user?.plan === "starter" ? "Paid plan diagnostics" : "Premium model diagnostics"}
            />
            <div className="space-y-2 text-sm text-ink-800">
              <p>Profit factor: <strong>{formatNumber(pro.profitFactor, 2)}</strong></p>
              <p>Expectancy: <strong>{formatCurrency(pro.expectancy)}</strong></p>
              <p>Max drawdown: <strong>{formatCurrency(pro.maxDrawdown)}</strong></p>
            </div>
          </Card>
        )}
      </section>

      {user?.plan === "pro" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="PnL by Session" subtitle="Where your edge is strongest" />
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pro.pnlBySession}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5ECF7" />
                  <XAxis dataKey="session" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="pnl" fill="#111A2E" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Rolling Win Rate" subtitle="Last 20-trade rolling window" />
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pro.rollingWinRate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5ECF7" />
                  <XAxis dataKey="index" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                  <Line type="monotone" dataKey="winRate" stroke="#F2B84B" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      ) : (
        <LockedPanel onUpgrade={() => navigate("/app/settings")} />
      )}
    </div>
  );
}
