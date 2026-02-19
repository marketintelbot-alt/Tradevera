import { Card } from "@/components/ui/Card";

export function MetricTile({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-ink-700">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink-900">{value}</p>
      {caption ? <p className="mt-1 text-xs text-ink-700">{caption}</p> : null}
    </Card>
  );
}
