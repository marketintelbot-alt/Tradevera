export const PLAN_VALUES = ["free", "starter", "pro"] as const;
export type Plan = (typeof PLAN_VALUES)[number];

export const ASSET_CLASS_VALUES = ["stocks", "options", "futures", "crypto", "forex"] as const;
export type AssetClass = (typeof ASSET_CLASS_VALUES)[number];

export const DIRECTION_VALUES = ["long", "short"] as const;
export type Direction = (typeof DIRECTION_VALUES)[number];

export const SESSION_VALUES = ["Asia", "London", "NY"] as const;
export type TradingSession = (typeof SESSION_VALUES)[number];

export const PROJECT_STATUS_VALUES = ["active", "paused", "completed", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUS_VALUES)[number];

export const TASK_STATUS_VALUES = ["todo", "in_progress", "done"] as const;
export type TaskStatus = (typeof TASK_STATUS_VALUES)[number];

export const TASK_PRIORITY_VALUES = ["low", "medium", "high", "critical"] as const;
export type TaskPriority = (typeof TASK_PRIORITY_VALUES)[number];

export const RISK_TRIGGER_REASON_VALUES = ["daily_max_loss", "loss_streak", "combined"] as const;
export type RiskTriggerReason = (typeof RISK_TRIGGER_REASON_VALUES)[number];

export interface UserMe {
  id: string;
  email: string;
  plan: Plan;
  tradeCount: number;
  tradeLimit: number | null;
  freeDaysTotal: number | null;
  freeDaysRemaining: number | null;
  freeExpiresAt: string | null;
  freeExpired: boolean;
  canUseProFeatures: boolean;
}

export interface Trade {
  id: string;
  user_id: string;
  opened_at: string;
  closed_at: string | null;
  symbol: string;
  asset_class: AssetClass;
  direction: Direction;
  entry_price: number;
  exit_price: number | null;
  size: number;
  fees: number;
  pnl: number | null;
  r_multiple: number | null;
  setup: string | null;
  timeframe: string | null;
  session: TradingSession | null;
  confidence: number | null;
  plan_adherence: boolean;
  notes: string | null;
  mistakes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeRiskTrigger {
  reason: RiskTriggerReason;
  lockoutUntil: string;
}

export interface CreateTradeResponse {
  trade: Trade;
  riskTriggered?: TradeRiskTrigger;
}

export interface TradeScreenshot {
  id: string;
  trade_id: string;
  user_id: string;
  image_data: string;
  caption: string | null;
  created_at: string;
}

export interface TradeScreenshotsResponse {
  screenshots: TradeScreenshot[];
}

export interface SubscriptionInfo {
  id: string;
  user_id: string;
  customer_id: string;
  status: string;
  price_id: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeResponse {
  user: UserMe;
}

export interface TradesResponse {
  trades: Trade[];
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  details: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  completed_at: string | null;
  estimate_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface TasksResponse {
  tasks: Task[];
}

export interface RiskSettings {
  user_id: string;
  enabled: boolean;
  daily_max_loss: number | null;
  max_consecutive_losses: number | null;
  cooldown_minutes: number;
  lockout_until: string | null;
  last_trigger_reason: RiskTriggerReason | null;
  created_at: string;
  updated_at: string;
}

export interface RiskStatus {
  isLocked: boolean;
  lockoutUntil: string | null;
  reason: RiskTriggerReason | null;
}

export interface RiskSettingsResponse {
  settings: RiskSettings;
  status: RiskStatus;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
}

export interface WeeklyReview {
  weekStart: string;
  weekEnd: string;
  totalTrades: number;
  winRate: number;
  topSetups: string[];
  commonMistakes: string[];
  actionItems: string[];
}

export interface AiCoachSnapshot {
  totalTrades: number;
  closedTrades: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  bestSetup: string;
  weakestSetup: string;
  adherenceRate: number;
}

export interface AiCoachResponse {
  generatedAt: string;
  lookbackDays: number;
  headline: string;
  answer: string;
  snapshot: AiCoachSnapshot;
  whatWorked: string[];
  whatToImprove: string[];
  actionItems: string[];
}
