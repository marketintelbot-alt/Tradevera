import { Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function LockedPanel({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <Card className="relative overflow-hidden border-ink-200">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/85 via-white/70 to-white/85 backdrop-blur-[1px]" />
      <div className="relative z-10 flex flex-col items-start gap-3 p-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-3 py-1 text-xs font-semibold text-white">
          <Lock className="h-3.5 w-3.5" /> Pro analytics locked
        </span>
        <h3 className="text-lg font-semibold text-ink-900">Unlock your full edge</h3>
        <p className="max-w-xl text-sm text-ink-700">
          Pro includes AI Assistant, expectancy, drawdown, rolling win rate, session performance, weekly review export, and ad-free workflow.
        </p>
        <Button onClick={onUpgrade}>Upgrade to Pro</Button>
      </div>
    </Card>
  );
}
