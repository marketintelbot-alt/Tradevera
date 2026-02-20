import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { AssistantPage } from "@/pages/app/AssistantPage";
import { DashboardPage } from "@/pages/app/DashboardPage";
import { CalendarPage } from "@/pages/app/CalendarPage";
import { NewTradePage } from "@/pages/app/NewTradePage";
import { ProjectsPage } from "@/pages/app/ProjectsPage";
import { ReviewPage } from "@/pages/app/ReviewPage";
import { SettingsPage } from "@/pages/app/SettingsPage";
import { ToolsPage } from "@/pages/app/ToolsPage";
import { TradesPage } from "@/pages/app/TradesPage";
import { AuthCallbackPage } from "@/pages/auth/AuthCallbackPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { LandingPage } from "@/pages/marketing/LandingPage";

function ProtectedShell() {
  const { user, loading, refreshMe } = useAuth();
  const [verifyingSession, setVerifyingSession] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user) {
      setSessionChecked(false);
      setVerifyingSession(false);
      return;
    }

    if (sessionChecked || verifyingSession) {
      return;
    }

    setVerifyingSession(true);
    void refreshMe().finally(() => {
      setVerifyingSession(false);
      setSessionChecked(true);
    });
  }, [loading, refreshMe, sessionChecked, user, verifyingSession]);

  useEffect(() => {
    const shouldWatch = loading || verifyingSession || (!user && !sessionChecked);
    if (!shouldWatch) {
      setStalled(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setStalled(true);
    }, 9000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loading, sessionChecked, user, verifyingSession]);

  if (stalled) {
    return (
      <div className="mx-auto mt-24 w-full max-w-xl space-y-4 px-4">
        <div className="rounded-xl border border-amber-500/35 bg-amber-100 p-4">
          <p className="text-sm font-semibold text-ink-900">Session is taking longer than expected.</p>
          <p className="mt-1 text-sm text-ink-800">
            We did not receive a profile response in time. Retry now, or go back to login and sign in again.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setStalled(false);
                setSessionChecked(false);
                setVerifyingSession(false);
                void refreshMe();
              }}
            >
              Retry session
            </Button>
            <Button
              onClick={() => {
                window.location.assign("/login");
              }}
            >
              Go to login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || verifyingSession || (!user && !sessionChecked)) {
    return (
      <div className="mx-auto mt-24 w-full max-w-xl space-y-4 px-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      <Route path="/app" element={<ProtectedShell />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="trades" element={<TradesPage />} />
        <Route path="trades/new" element={<NewTradePage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="tools" element={<ToolsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
