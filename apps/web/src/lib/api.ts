import type {
  AiCoachResponse,
  CreateTradeResponse,
  MeResponse,
  Project,
  ProjectsResponse,
  RiskSettingsResponse,
  Task,
  TasksResponse,
  Trade,
  TradeScreenshot,
  TradeScreenshotsResponse,
  TradesResponse
} from "@tradevera/shared";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8787";

function trimWrappingQuotes(value: string): string {
  if (value.length < 2) {
    return value;
  }

  const first = value[0];
  const last = value[value.length - 1];
  const matchingQuote = (first === `"` && last === `"`) || (first === "'" && last === "'") || (first === "`" && last === "`");
  return matchingQuote ? value.slice(1, -1) : value;
}

function resolveApiBaseUrl(value: string | undefined): string {
  const normalized = trimWrappingQuotes((value ?? "").trim()).trim().replace(/\/+$/, "");
  if (normalized.length === 0) {
    return DEFAULT_API_BASE_URL;
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (/^[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(normalized)) {
    return `https://${normalized}`.replace(/\/+$/, "");
  }

  return DEFAULT_API_BASE_URL;
}

const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
const SESSION_FALLBACK_STORAGE_KEY = "tradevera_session_fallback";
const DEFAULT_REQUEST_TIMEOUT_MS = 6500;

function resolveRequestTimeoutMs(): number {
  const raw = Number(import.meta.env.VITE_API_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw >= 1000) {
    return Math.floor(raw);
  }
  return DEFAULT_REQUEST_TIMEOUT_MS;
}

const REQUEST_TIMEOUT_MS = resolveRequestTimeoutMs();

let cachedSessionFallbackToken: string | null | undefined;

function decodeBase64UrlJson(value: string): unknown {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const json = atob(padded);
  return JSON.parse(json);
}

export function decodeSessionTokenClaims(token: string): { sub: string; email: string; exp?: number; iat?: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  try {
    const payload = decodeBase64UrlJson(parts[1]) as { sub?: unknown; email?: unknown; exp?: unknown; iat?: unknown };
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      exp: typeof payload.exp === "number" ? payload.exp : undefined,
      iat: typeof payload.iat === "number" ? payload.iat : undefined
    };
  } catch {
    return null;
  }
}

function getSessionFallbackToken(): string | null {
  if (cachedSessionFallbackToken !== undefined) {
    return cachedSessionFallbackToken;
  }

  if (typeof window === "undefined") {
    cachedSessionFallbackToken = null;
    return cachedSessionFallbackToken;
  }

  try {
    const stored = window.localStorage.getItem(SESSION_FALLBACK_STORAGE_KEY);
    cachedSessionFallbackToken = stored && stored.trim().length > 0 ? stored.trim() : null;
  } catch {
    cachedSessionFallbackToken = null;
  }

  return cachedSessionFallbackToken;
}

function setSessionFallbackToken(token: string | null) {
  cachedSessionFallbackToken = token && token.trim().length > 0 ? token.trim() : null;
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (cachedSessionFallbackToken) {
      window.localStorage.setItem(SESSION_FALLBACK_STORAGE_KEY, cachedSessionFallbackToken);
    } else {
      window.localStorage.removeItem(SESSION_FALLBACK_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures in private mode / restricted browsers.
  }
}

function hydrateSessionFallbackToken(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("sessionToken" in payload)) {
    return;
  }

  const token = (payload as { sessionToken?: unknown }).sessionToken;
  if (typeof token === "string" && token.trim().length > 0) {
    setSessionFallbackToken(token);
  }
}

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const hadAuthorizationHeader = headers.has("Authorization");
  const fallbackTokenAtRequestStart = getSessionFallbackToken();
  if (fallbackTokenAtRequestStart && !hadAuthorizationHeader) {
    headers.set("Authorization", `Bearer ${fallbackTokenAtRequestStart}`);
  }

  const authorizationHeader = headers.get("Authorization");
  const authorizationMatch = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  const authorizationTokenUsed = authorizationMatch ? authorizationMatch[1].trim() : null;
  const implicitFallbackTokenUsed = !hadAuthorizationHeader ? fallbackTokenAtRequestStart : null;

  const clearFallbackTokenIfStale = () => {
    const currentFallbackToken = getSessionFallbackToken();
    const tokenUsedByRequest = authorizationTokenUsed ?? implicitFallbackTokenUsed;
    if (!currentFallbackToken || !tokenUsedByRequest) {
      return;
    }
    if (currentFallbackToken === tokenUsedByRequest) {
      setSessionFallbackToken(null);
    }
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const timeoutController = new AbortController();
  const forwardedSignal = init?.signal;
  const forwardAbort = () => {
    timeoutController.abort();
  };

  if (forwardedSignal) {
    if (forwardedSignal.aborted) {
      timeoutController.abort();
    } else {
      forwardedSignal.addEventListener("abort", forwardAbort, { once: true });
    }
  }

  const timeoutHandle = window.setTimeout(() => {
    timeoutController.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
      ...init,
      credentials: "include",
      headers,
      cache: "no-store",
      signal: timeoutController.signal
    });

    const rawBody = await response.text();
    let data: unknown = rawBody;
    if (rawBody.length > 0) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = rawBody;
      }
    }
    hydrateSessionFallbackToken(data);

    if (!response.ok) {
      if (response.status === 401) {
        clearFallbackTokenIfStale();
      }
      const message = typeof data === "object" && data && "error" in data ? String((data as { error: string }).error) : response.statusText;
      throw new ApiError(message, response.status, data);
    }

    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out. Please check your connection and try again.", 408);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutHandle);
    if (forwardedSignal) {
      forwardedSignal.removeEventListener("abort", forwardAbort);
    }
  }
}

export interface TradeFilters {
  [key: string]: string | undefined;
  search?: string;
  symbol?: string;
  from?: string;
  to?: string;
  setup?: string;
}

export interface TaskFilters {
  [key: string]: string | undefined;
  project_id?: string;
  status?: "todo" | "in_progress" | "done";
  priority?: "low" | "medium" | "high" | "critical";
  search?: string;
}

function queryString(params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value && value.length > 0) {
      searchParams.set(key, value);
    }
  });

  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : "";
}

export const api = {
  async requestMagicLink(
    email: string
  ): Promise<{ success: boolean; message: string; magicLink?: string; delivery?: "email" | "debug"; requestId?: string }> {
    return request("/auth/request-link", {
      method: "POST",
      body: JSON.stringify({ email })
    });
  },

  async consumeMagicLink(token: string): Promise<{
    success: boolean;
    redirectTo?: string;
    passwordProvisioned?: boolean;
    passwordDelivery?: "email" | "debug" | null;
    temporaryPassword?: string;
    sessionToken?: string;
    sessionAuthMode?: "bearer";
  }> {
    const response = await request<{
      success: boolean;
      redirectTo?: string;
      passwordProvisioned?: boolean;
      passwordDelivery?: "email" | "debug" | null;
      temporaryPassword?: string;
      sessionToken?: string;
      sessionAuthMode?: "bearer";
    }>("/auth/consume", {
      method: "POST",
      body: JSON.stringify({ token })
    });
    if (response.sessionToken) {
      setSessionFallbackToken(response.sessionToken);
    }
    return response;
  },

  async loginWithPassword(
    email: string,
    password: string
  ): Promise<{ success: boolean; redirectTo?: string; sessionToken?: string; sessionAuthMode?: "bearer" }> {
    const response = await request<{ success: boolean; redirectTo?: string; sessionToken?: string; sessionAuthMode?: "bearer" }>(
      "/auth/login-password",
      {
        method: "POST",
        body: JSON.stringify({ email, password })
      }
    );
    if (response.sessionToken) {
      setSessionFallbackToken(response.sessionToken);
    }
    return response;
  },

  async meWithSessionToken(sessionToken: string): Promise<MeResponse> {
    return request("/api/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionToken}`
      }
    });
  },

  async requestPassword(
    email: string
  ): Promise<{ success: boolean; message: string; delivery?: "email" | "debug"; temporaryPassword?: string }> {
    return request("/auth/request-password", {
      method: "POST",
      body: JSON.stringify({ email })
    });
  },

  async logout(): Promise<{ success: boolean }> {
    try {
      return await request("/api/logout", { method: "POST" });
    } finally {
      setSessionFallbackToken(null);
    }
  },

  async me(): Promise<MeResponse> {
    return request("/api/me", { method: "GET" });
  },

  async listTrades(filters: TradeFilters = {}): Promise<TradesResponse> {
    return request(`/api/trades${queryString(filters)}`);
  },

  async createTrade(payload: Record<string, unknown>): Promise<CreateTradeResponse> {
    return request("/api/trades", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async updateTrade(id: string, payload: Record<string, unknown>): Promise<{ trade: Trade }> {
    return request(`/api/trades/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },

  async deleteTrade(id: string): Promise<{ success: boolean }> {
    return request(`/api/trades/${id}`, {
      method: "DELETE"
    });
  },

  async createCheckoutSession(options?: {
    tier?: "starter" | "pro";
    priceId?: string;
  }): Promise<{ checkoutUrl: string; id: string }> {
    const payload = {
      ...(options?.tier ? { tier: options.tier } : {}),
      ...(options?.priceId ? { priceId: options.priceId } : {})
    };
    return request("/api/stripe/create-checkout-session", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async createPortalSession(): Promise<{ portalUrl: string; id: string }> {
    return request("/api/stripe/create-portal-session", {
      method: "POST",
      body: JSON.stringify({})
    });
  },

  async askAiCoach(payload: { question?: string; lookbackDays?: number }): Promise<AiCoachResponse> {
    return request("/api/ai/coach", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async listProjects(): Promise<ProjectsResponse> {
    return request("/api/projects", { method: "GET" });
  },

  async createProject(payload: {
    name: string;
    description?: string | null;
    color?: string;
    status?: "active" | "paused" | "completed" | "archived";
  }): Promise<{ project: Project }> {
    return request("/api/projects", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async updateProject(
    id: string,
    payload: {
      name?: string;
      description?: string | null;
      color?: string;
      status?: "active" | "paused" | "completed" | "archived";
    }
  ): Promise<{ project: Project }> {
    return request(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },

  async deleteProject(id: string): Promise<{ success: boolean }> {
    return request(`/api/projects/${id}`, {
      method: "DELETE"
    });
  },

  async listTasks(filters: TaskFilters = {}): Promise<TasksResponse> {
    return request(`/api/tasks${queryString(filters)}`, { method: "GET" });
  },

  async createTask(payload: {
    project_id?: string | null;
    title: string;
    details?: string | null;
    status?: "todo" | "in_progress" | "done";
    priority?: "low" | "medium" | "high" | "critical";
    due_at?: string | null;
    estimate_minutes?: number | null;
  }): Promise<{ task: Task }> {
    return request("/api/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async updateTask(
    id: string,
    payload: {
      project_id?: string | null;
      title?: string;
      details?: string | null;
      status?: "todo" | "in_progress" | "done";
      priority?: "low" | "medium" | "high" | "critical";
      due_at?: string | null;
      estimate_minutes?: number | null;
    }
  ): Promise<{ task: Task }> {
    return request(`/api/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },

  async deleteTask(id: string): Promise<{ success: boolean }> {
    return request(`/api/tasks/${id}`, {
      method: "DELETE"
    });
  },

  async listTradeScreenshots(tradeId: string): Promise<TradeScreenshotsResponse> {
    return request(`/api/trades/${tradeId}/screenshots`, { method: "GET" });
  },

  async createTradeScreenshot(
    tradeId: string,
    payload: { image_data: string; caption?: string | null }
  ): Promise<{ screenshot: TradeScreenshot }> {
    return request(`/api/trades/${tradeId}/screenshots`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async deleteTradeScreenshot(tradeId: string, screenshotId: string): Promise<{ success: boolean }> {
    return request(`/api/trades/${tradeId}/screenshots/${screenshotId}`, {
      method: "DELETE"
    });
  },

  async getRiskSettings(): Promise<RiskSettingsResponse> {
    return request("/api/risk-settings", { method: "GET" });
  },

  async updateRiskSettings(payload: {
    enabled?: boolean;
    daily_max_loss?: number | null;
    max_consecutive_losses?: number | null;
    cooldown_minutes?: number;
  }): Promise<RiskSettingsResponse> {
    return request("/api/risk-settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },

  async unlockRiskSettings(): Promise<RiskSettingsResponse> {
    return request("/api/risk-settings/unlock", {
      method: "POST",
      body: JSON.stringify({})
    });
  }
};
