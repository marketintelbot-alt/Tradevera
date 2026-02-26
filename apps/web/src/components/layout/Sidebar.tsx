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
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/app/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/prep", label: "Prep", icon: ClipboardCheck },
  { to: "/app/psychology", label: "Psychology", icon: Brain },
  { to: "/app/accountability", label: "Accountability", icon: Target },
  { to: "/app/assistant", label: "AI Assistant", icon: Bot },
  { to: "/app/projects", label: "Projects", icon: FolderKanban },
  { to: "/app/prop-firms", label: "Prop Firms", icon: Building2 },
  { to: "/app/trades", label: "Trades", icon: ClipboardList },
  { to: "/app/trades/new", label: "Add Trade", icon: Sparkles },
  { to: "/app/review", label: "Weekly Review", icon: BarChart3 },
  { to: "/app/tools", label: "Tools", icon: Wrench },
  { to: "/app/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  return (
    <aside className="hidden w-72 border-r border-ink-200 bg-white/70 p-4 backdrop-blur-sm dark:border-ink-700 dark:bg-ink-950/70 lg:block">
      <div className="mb-7 px-3">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-700 dark:text-ink-200">Tradevera</p>
        <h2 className="mt-1 text-xl font-semibold text-ink-900 dark:text-white">Journal OS</h2>
        <p className="mt-1 text-xs text-ink-700 dark:text-ink-200">Capture, analyze, improve, and execute.</p>
      </div>
      <nav className="space-y-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-ink-900 text-white shadow-soft dark:bg-mint-400 dark:text-ink-950"
                  : "text-ink-800 hover:bg-ink-100 dark:text-ink-100 dark:hover:bg-ink-800"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
