import { forwardRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Card = forwardRef<HTMLElement, { className?: string; children: ReactNode }>(function Card(
  { className, children },
  ref
) {
  return (
    <section ref={ref} className={cn("rounded-2xl border border-ink-200 bg-white p-5 shadow-soft", className)}>
      {children}
    </section>
  );
});

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-ink-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-ink-700">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}
