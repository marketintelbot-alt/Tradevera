import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
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

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user) {
      setSessionChecked(false);
      return;
    }

    if (verifyingSession || sessionChecked) {
      return;
    }

    let active = true;
    setVerifyingSession(true);
    void refreshMe().finally(() => {
      if (!active) {
        return;
      }
      setVerifyingSession(false);
      setSessionChecked(true);
    });

    return () => {
      active = false;
    };
  }, [loading, refreshMe, sessionChecked, user, verifyingSession]);

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
