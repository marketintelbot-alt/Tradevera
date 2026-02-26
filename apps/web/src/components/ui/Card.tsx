import { forwardRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Card = forwardRef<HTMLElement, { className?: string; children: ReactNode }>(function Card(
  { className, children },
  ref
) {
  return (
    <section
      ref={ref}
      className={cn(
        "rounded-2xl border border-ink-200 bg-white p-5 shadow-soft dark:border-ink-700 dark:bg-ink-900/90 dark:shadow-[0_14px_36px_rgba(0,0,0,0.28)]",
        className
      )}
    >
      {children}
    </section>
  );
});

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-ink-900 dark:text-white">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-ink-700 dark:text-ink-200">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}
