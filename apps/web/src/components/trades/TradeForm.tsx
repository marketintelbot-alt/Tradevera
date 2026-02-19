import { useMemo, useState, type FormEvent } from "react";
import type { Trade } from "@tradevera/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { fromDateTimeLocal, toDateTimeLocal, toDateTimeLocalValue } from "@/lib/utils";

interface TradeFormProps {
  mode?: "quick" | "full";
  initialValue?: Partial<Trade>;
  submitLabel?: string;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  submitting?: boolean;
}

const assetClasses = ["stocks", "options", "futures", "crypto", "forex"] as const;
const directions = ["long", "short"] as const;
const sessions = ["Asia", "London", "NY"] as const;

export function TradeForm({
  mode = "full",
  initialValue,
  submitLabel = "Save trade",
  onSubmit,
  onCancel,
  submitting = false
}: TradeFormProps) {
  const defaults = useMemo(
    () => ({
      opened_at: initialValue?.opened_at ? toDateTimeLocal(initialValue.opened_at) : toDateTimeLocalValue(new Date()),
      closed_at: initialValue?.closed_at ? toDateTimeLocal(initialValue.closed_at) : "",
      symbol: initialValue?.symbol ?? "",
      asset_class: initialValue?.asset_class ?? "stocks",
      direction: initialValue?.direction ?? "long",
      entry_price: initialValue?.entry_price ? String(initialValue.entry_price) : "",
      exit_price: initialValue?.exit_price ? String(initialValue.exit_price) : "",
      size: initialValue?.size ? String(initialValue.size) : "",
      fees: initialValue?.fees !== undefined && initialValue.fees !== null ? String(initialValue.fees) : "0",
      r_multiple: initialValue?.r_multiple !== undefined && initialValue.r_multiple !== null ? String(initialValue.r_multiple) : "",
      setup: initialValue?.setup ?? "",
      timeframe: initialValue?.timeframe ?? "",
      session: initialValue?.session ?? "NY",
      confidence: initialValue?.confidence ? String(initialValue.confidence) : "",
      plan_adherence: initialValue?.plan_adherence ?? true,
      notes: initialValue?.notes ?? "",
      mistakes: initialValue?.mistakes ?? ""
    }),
    [initialValue]
  );

  const [form, setForm] = useState(defaults);

  const updateField = <T extends keyof typeof form>(key: T, value: (typeof form)[T]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const payload = {
      opened_at: fromDateTimeLocal(form.opened_at),
      closed_at: form.closed_at ? fromDateTimeLocal(form.closed_at) : null,
      symbol: form.symbol,
      asset_class: form.asset_class,
      direction: form.direction,
      entry_price: Number(form.entry_price),
      exit_price: form.exit_price ? Number(form.exit_price) : null,
      size: Number(form.size),
      fees: Number(form.fees || 0),
      r_multiple: form.r_multiple ? Number(form.r_multiple) : null,
      setup: form.setup || null,
      timeframe: form.timeframe || null,
      session: form.session || null,
      confidence: form.confidence ? Number(form.confidence) : null,
      plan_adherence: form.plan_adherence,
      notes: form.notes || null,
      mistakes: form.mistakes || null
    };

    await onSubmit(payload);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Opened at" type="datetime-local" value={form.opened_at} onChange={(e) => updateField("opened_at", e.target.value)} required />
        <Input label="Closed at" type="datetime-local" value={form.closed_at} onChange={(e) => updateField("closed_at", e.target.value)} />

        <Input label="Symbol" value={form.symbol} placeholder="AAPL" onChange={(e) => updateField("symbol", e.target.value.toUpperCase())} required />

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-800">Asset class</span>
          <select
            value={form.asset_class}
            onChange={(e) => updateField("asset_class", e.target.value as (typeof assetClasses)[number])}
            className="h-11 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
          >
            {assetClasses.map((assetClass) => (
              <option key={assetClass} value={assetClass}>
                {assetClass}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-800">Direction</span>
          <select
            value={form.direction}
            onChange={(e) => updateField("direction", e.target.value as (typeof directions)[number])}
            className="h-11 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
          >
            {directions.map((direction) => (
              <option key={direction} value={direction}>
                {direction}
              </option>
            ))}
          </select>
        </label>

        <Input label="Entry" type="number" step="0.0001" value={form.entry_price} onChange={(e) => updateField("entry_price", e.target.value)} required />
        <Input label="Exit" type="number" step="0.0001" value={form.exit_price} onChange={(e) => updateField("exit_price", e.target.value)} />
        <Input label="Size" type="number" step="0.0001" value={form.size} onChange={(e) => updateField("size", e.target.value)} required />
        <Input label="Fees" type="number" step="0.01" value={form.fees} onChange={(e) => updateField("fees", e.target.value)} />
      </div>

      {mode === "full" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="R multiple" type="number" step="0.01" value={form.r_multiple} onChange={(e) => updateField("r_multiple", e.target.value)} />
          <Input label="Setup" value={form.setup} onChange={(e) => updateField("setup", e.target.value)} />
          <Input label="Timeframe" value={form.timeframe} placeholder="15m" onChange={(e) => updateField("timeframe", e.target.value)} />

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink-800">Session</span>
            <select
              value={form.session}
              onChange={(e) => updateField("session", e.target.value as (typeof sessions)[number])}
              className="h-11 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
            >
              {sessions.map((session) => (
                <option key={session} value={session}>
                  {session}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="Confidence (0-100)"
            type="number"
            min={0}
            max={100}
            value={form.confidence}
            onChange={(e) => updateField("confidence", e.target.value)}
          />

          <label className="mt-7 inline-flex items-center gap-2 text-sm text-ink-800">
            <input
              type="checkbox"
              checked={form.plan_adherence}
              onChange={(event) => updateField("plan_adherence", event.target.checked)}
              className="h-4 w-4 rounded border-ink-300"
            />
            Followed trade plan
          </label>

          <label className="sm:col-span-2 lg:col-span-3">
            <span className="text-sm font-semibold text-ink-800">Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
              placeholder="Execution, context, emotions..."
            />
          </label>

          <Input
            label="Mistakes (comma-separated)"
            value={form.mistakes}
            onChange={(e) => updateField("mistakes", e.target.value)}
            hint="Example: late entry, moved stop"
            className="sm:col-span-2 lg:col-span-3"
          />
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
