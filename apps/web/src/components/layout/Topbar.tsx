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
    <header className="sticky top-0 z-20 border-b border-ink-200/70 bg-white/85 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 text-ink-800 lg:hidden"
            onClick={onMobileMenu}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm font-semibold text-ink-900">Trading workspace</p>
            <p className="text-xs text-ink-700">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <InstallAppButton />
          <FocusTimer />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="gap-2"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
          </Button>
          {user?.plan === "pro" ? <Badge tone="success">Pro</Badge> : <Badge tone="warning">Free</Badge>}
          {user?.plan === "free" && (
            <Link to="/app/settings">
              <Button size="sm" className="gap-2">
                <Crown className="h-4 w-4" /> Upgrade
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
