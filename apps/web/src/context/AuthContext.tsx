import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { UserMe } from "@tradevera/shared";
import { ApiError, api } from "@/lib/api";

interface AuthContextValue {
  user: UserMe | null;
  loading: boolean;
  setAuthUser: (nextUser: UserMe | null) => void;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_CACHE_STORAGE_KEY = "tradevera_user_cache_v1";
const RECENT_AUTH_STORAGE_KEY = "tradevera_recent_auth_at";
const RECENT_AUTH_WINDOW_MS = 2 * 60 * 1000;
const SESSION_INVALID_EVENT = "tradevera:session-invalid";

function isUserMe(value: unknown): value is UserMe {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<UserMe>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.email === "string" &&
    (candidate.plan === "free" || candidate.plan === "starter" || candidate.plan === "pro") &&
    typeof candidate.tradeCount === "number"
  );
}

function readCachedUser(): UserMe | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(USER_CACHE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isUserMe(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedUser(nextUser: UserMe | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (nextUser) {
      window.localStorage.setItem(USER_CACHE_STORAGE_KEY, JSON.stringify(nextUser));
    } else {
      window.localStorage.removeItem(USER_CACHE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures in restricted browsing modes.
  }
}

function markRecentAuthNow() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(RECENT_AUTH_STORAGE_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures in restricted browsing modes.
  }
}

function clearRecentAuthMarker() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(RECENT_AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage failures in restricted browsing modes.
  }
}

function hasRecentAuthMarker(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const raw = window.sessionStorage.getItem(RECENT_AUTH_STORAGE_KEY);
    if (!raw) {
      return false;
    }
    const timestamp = Number(raw);
    if (!Number.isFinite(timestamp)) {
      return false;
    }
    return Date.now() - timestamp <= RECENT_AUTH_WINDOW_MS;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(() => readCachedUser());
  const [loading, setLoading] = useState<boolean>(true);
  const refreshVersionRef = useRef(0);
  const userRef = useRef<UserMe | null>(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const setAuthUser = useCallback((nextUser: UserMe | null) => {
    userRef.current = nextUser;
    setUser(nextUser);
    writeCachedUser(nextUser);
    if (nextUser) {
      markRecentAuthNow();
    } else {
      clearRecentAuthMarker();
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const refreshVersion = ++refreshVersionRef.current;
    const isLatestRefresh = () => refreshVersion === refreshVersionRef.current;

    const attempts = 2;
    for (let index = 0; index < attempts; index += 1) {
      try {
        const response = await api.me();
        if (!isLatestRefresh()) {
          return;
        }
        setAuthUser(response.user);
        return;
      } catch (error) {
        if (!isLatestRefresh()) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          if (userRef.current && hasRecentAuthMarker() && index < attempts - 1) {
            // Allow one retry for transient auth propagation races after login.
            clearRecentAuthMarker();
            await new Promise((resolve) => window.setTimeout(resolve, 220));
            continue;
          }
          setAuthUser(null);
          return;
        }

        if (index < attempts - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 180 * (index + 1)));
          continue;
        }

        console.error("Failed to fetch /api/me", error);
      }
    }
  }, [setAuthUser]);

  const logout = useCallback(async () => {
    refreshVersionRef.current += 1;
    await api.logout();
    setAuthUser(null);
  }, [setAuthUser]);

  useEffect(() => {
    const onSessionInvalid = () => {
      if (userRef.current) {
        setAuthUser(null);
      }
      setLoading(false);
    };

    window.addEventListener(SESSION_INVALID_EVENT, onSessionInvalid as EventListener);
    return () => {
      window.removeEventListener(SESSION_INVALID_EVENT, onSessionInvalid as EventListener);
    };
  }, [setAuthUser]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await refreshMe();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [refreshMe]);

  const value = useMemo(
    () => ({
      user,
      loading,
      setAuthUser,
      refreshMe,
      logout
    }),
    [user, loading, setAuthUser, refreshMe, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
