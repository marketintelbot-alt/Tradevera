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
        tone === "neutral" && "bg-ink-100 text-ink-800",
        tone === "success" && "bg-mint-100 text-ink-900",
        tone === "warning" && "bg-amber-100 text-ink-900",
        tone === "accent" && "bg-ink-900 text-white",
        className
      )}
    >
      {children}
    </span>
  );
}
