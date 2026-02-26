import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bot,
  Brain,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FolderKanban,
  Gauge,
  Settings,
  Sparkles,
  Target,
  Wrench
} from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { QuickAddTradeModal } from "@/components/trades/QuickAddTradeModal";
import { useToast } from "@/components/common/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/app/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/prep", label: "Prep", icon: ClipboardCheck },
  { to: "/app/psychology", label: "Psychology", icon: Brain },
  { to: "/app/accountability", label: "Accountability", icon: Target },
  { to: "/app/assistant", label: "Assistant", icon: Bot },
  { to: "/app/projects", label: "Projects", icon: FolderKanban },
  { to: "/app/prop-firms", label: "Prop Firms", icon: Building2 },
  { to: "/app/trades", label: "Trades", icon: ClipboardList },
  { to: "/app/trades/new", label: "Add", icon: Sparkles },
  { to: "/app/review", label: "Review", icon: BarChart3 },
  { to: "/app/tools", label: "Tools", icon: Wrench },
  { to: "/app/settings", label: "Settings", icon: Settings }
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshMe } = useAuth();
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddSubmitting, setQuickAddSubmitting] = useState(false);

  const handleQuickAddSubmit = async (payload: Record<string, unknown>) => {
    setQuickAddSubmitting(true);
    try {
      const response = await api.createTrade(payload);
      await refreshMe();
      setQuickAddOpen(false);
      toast({ title: "Trade added", description: "Captured from mobile quick-add.", tone: "success" });
      if (response.riskTriggered) {
        toast({
          title: "Risk guardrail triggered",
          description: `Lockout active until ${new Date(response.riskTriggered.lockoutUntil).toLocaleString()} (${response.riskTriggered.reason}).`,
          tone: "info"
        });
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 402) {
        toast({ title: "Upgrade required", description: error.message, tone: "error" });
        navigate("/app/settings");
      } else if (error instanceof ApiError && error.status === 423) {
        toast({ title: "Trading lockout active", description: error.message, tone: "error" });
      } else {
        toast({ title: "Could not add trade", description: error instanceof Error ? error.message : "Unexpected error", tone: "error" });
      }
    } finally {
      setQuickAddSubmitting(false);
    }
  };

  const showQuickAddFab = location.pathname !== "/app/trades/new";

  return (
    <div className="min-h-screen bg-transparent lg:flex">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar onMobileMenu={() => setMobileOpen((current) => !current)} />
        {mobileOpen && (
          <nav className="border-b border-ink-200 bg-white/90 p-3 backdrop-blur-sm dark:border-ink-700 dark:bg-ink-950/90 lg:hidden">
            <div className="grid grid-cols-3 gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3 py-2 text-center text-xs font-semibold",
                      isActive
                        ? "bg-ink-900 text-white dark:bg-mint-400 dark:text-ink-950"
                        : "bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-ink-100"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}

        <main className="mx-auto w-full max-w-[92rem] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      {showQuickAddFab && (
        <button
          type="button"
          className="fixed bottom-5 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-3 text-sm font-semibold text-white shadow-panel dark:bg-mint-400 dark:text-ink-950 lg:hidden"
          onClick={() => setQuickAddOpen(true)}
        >
          <Sparkles className="h-4 w-4" />
          Quick add
        </button>
      )}

      <QuickAddTradeModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        submitting={quickAddSubmitting}
        onSubmit={handleQuickAddSubmit}
      />
    </div>
  );
}
