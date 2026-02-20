import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(() => readCachedUser());
  const [loading, setLoading] = useState<boolean>(() => readCachedUser() === null);

  const setAuthUser = useCallback((nextUser: UserMe | null) => {
    setUser(nextUser);
    writeCachedUser(nextUser);
  }, []);

  const refreshMe = useCallback(async () => {
    const attempts = 2;
    for (let index = 0; index < attempts; index += 1) {
      try {
        const response = await api.me();
        setAuthUser(response.user);
        return;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
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
    await api.logout();
    setAuthUser(null);
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
