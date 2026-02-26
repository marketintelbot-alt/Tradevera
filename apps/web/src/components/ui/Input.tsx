import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, error, id, ...props },
  ref
) {
  return (
    <label className="flex w-full flex-col gap-2">
      {label && <span className="text-sm font-semibold text-ink-800 dark:text-ink-100">{label}</span>}
      <input
        id={id}
        ref={ref}
        className={cn(
          "h-11 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-700/55 focus:border-ink-700 focus:ring-4 focus:ring-ink-200/70 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-ink-200/50 dark:focus:border-mint-400 dark:focus:ring-mint-400/20",
          error && "border-coral-500 focus:border-coral-500 focus:ring-coral-500/20 dark:border-coral-500 dark:focus:border-coral-500",
          className
        )}
        {...props}
      />
      {error ? (
        <span className="text-xs text-coral-500">{error}</span>
      ) : hint ? (
        <span className="text-xs text-ink-700 dark:text-ink-200">{hint}</span>
      ) : null}
    </label>
  );
});
