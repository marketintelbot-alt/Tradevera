import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "accent";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold",
        tone === "neutral" && "bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100",
        tone === "success" && "bg-mint-100 text-ink-900 dark:bg-mint-400/20 dark:text-mint-400",
        tone === "warning" && "bg-amber-100 text-ink-900 dark:bg-amber-500/15 dark:text-amber-500",
        tone === "accent" && "bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-950",
        className
      )}
    >
      {children}
    </span>
  );
}
