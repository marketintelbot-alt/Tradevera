import { Menu, Crown, Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { FocusTimer } from "./FocusTimer";
import { InstallAppButton } from "./InstallAppButton";

interface TopbarProps {
  onMobileMenu: () => void;
}

export function Topbar({ onMobileMenu }: TopbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 border-b border-ink-200/70 bg-white/85 px-4 py-3 backdrop-blur-md dark:border-ink-800/80 dark:bg-ink-950/92 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 text-ink-800 dark:border-ink-700 dark:text-ink-100 lg:hidden"
            onClick={onMobileMenu}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm font-semibold tracking-tight text-ink-900 dark:text-white">Trading workspace</p>
            <p className="text-xs text-ink-700 dark:text-ink-200">Account details are available in Settings</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-ink-200/80 bg-white/70 px-2 py-1.5 shadow-soft dark:border-ink-700 dark:bg-ink-900/70">
          <InstallAppButton />
          <FocusTimer />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="gap-2 dark:text-white"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
          </Button>
          {user?.plan === "pro" ? (
            <Badge tone="success" className="border border-mint-500/35 dark:border-mint-300 dark:bg-mint-400 dark:text-ink-950">
              Pro
            </Badge>
          ) : user?.plan === "starter" ? (
            <Badge tone="accent" className="border border-ink-900 dark:border-sky-300 dark:bg-sky-300 dark:text-ink-950">
              Starter
            </Badge>
          ) : (
            <Badge tone="warning" className="border border-amber-500/35 dark:border-amber-300 dark:bg-amber-300 dark:text-ink-950">
              Free
            </Badge>
          )}
          {(user?.plan === "free" || user?.plan === "starter") && (
            <Link to="/app/settings">
              <Button size="sm" className="gap-2">
                <Crown className="h-4 w-4" /> {user?.plan === "starter" ? "Go Pro" : "Upgrade"}
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="sm" onClick={logout} className="dark:text-white">
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
