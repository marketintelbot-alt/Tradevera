import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (params: { title: string; description?: string; tone?: ToastTone }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, tone = "info" }: { title: string; description?: string; tone?: ToastTone }) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, title, description, tone }]);
      setTimeout(() => removeToast(id), 4200);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[90] flex w-[340px] max-w-[calc(100vw-32px)] flex-col gap-3">
        {toasts.map((item) => {
          const Icon = item.tone === "success" ? CheckCircle2 : item.tone === "error" ? AlertCircle : Info;
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border bg-white p-4 shadow-panel transition",
                item.tone === "success" && "border-mint-500/40",
                item.tone === "error" && "border-coral-500/40",
                item.tone === "info" && "border-ink-200"
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 text-ink-700" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                {item.description && <p className="text-xs leading-5 text-ink-700">{item.description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
