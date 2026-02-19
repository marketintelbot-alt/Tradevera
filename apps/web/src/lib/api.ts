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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787";

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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const isJson = response.headers.get("Content-Type")?.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === "object" && data && "error" in data ? String((data as { error: string }).error) : response.statusText;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
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

  async consumeMagicLink(token: string): Promise<{ success: boolean; redirectTo?: string }> {
    return request("/auth/consume", {
      method: "POST",
      body: JSON.stringify({ token })
    });
  },

  async logout(): Promise<{ success: boolean }> {
    return request("/api/logout", { method: "POST" });
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

  async createCheckoutSession(priceId?: string): Promise<{ checkoutUrl: string; id: string }> {
    return request("/api/stripe/create-checkout-session", {
      method: "POST",
      body: JSON.stringify(priceId ? { priceId } : {})
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
