import { nowIso } from "./security";

export interface UserRow {
  id: string;
  email: string;
  plan: "free" | "pro";
  created_at: string;
  session_version: number;
  password_hash: string | null;
  password_updated_at: string | null;
  pro_welcome_sent_at: string | null;
}

export interface TradeRow {
  id: string;
  user_id: string;
  opened_at: string;
  closed_at: string | null;
  symbol: string;
  asset_class: "stocks" | "options" | "futures" | "crypto" | "forex";
  direction: "long" | "short";
  entry_price: number;
  exit_price: number | null;
  size: number;
  fees: number;
  pnl: number | null;
  r_multiple: number | null;
  setup: string | null;
  timeframe: string | null;
  session: "Asia" | "London" | "NY" | null;
  confidence: number | null;
  plan_adherence: number;
  notes: string | null;
  mistakes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  customer_id: string;
  status: string;
  price_id: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiskSettingsRow {
  user_id: string;
  enabled: number;
  daily_max_loss: number | null;
  max_consecutive_losses: number | null;
  cooldown_minutes: number;
  lockout_until: string | null;
  last_trigger_reason: "daily_max_loss" | "loss_streak" | "combined" | null;
  created_at: string;
  updated_at: string;
}

interface CountResult {
  count: number;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  const result = await db.prepare("SELECT * FROM users WHERE email = ? LIMIT 1").bind(email).first<UserRow>();
  return result ?? null;
}

export async function getUserById(db: D1Database, id: string): Promise<UserRow | null> {
  const result = await db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").bind(id).first<UserRow>();
  return result ?? null;
}

export async function createUser(db: D1Database, email: string): Promise<UserRow> {
  const id = crypto.randomUUID();
  const createdAt = nowIso();
  await db
    .prepare(
      [
        "INSERT INTO users (id, email, plan, created_at, session_version, password_hash, password_updated_at, pro_welcome_sent_at)",
        "VALUES (?, ?, 'free', ?, 1, NULL, NULL, NULL)"
      ].join(" ")
    )
    .bind(id, email, createdAt)
    .run();

  return {
    id,
    email,
    plan: "free",
    created_at: createdAt,
    session_version: 1,
    password_hash: null,
    password_updated_at: null,
    pro_welcome_sent_at: null
  };
}

export async function incrementUserSessionVersion(db: D1Database, userId: string): Promise<void> {
  await db.prepare("UPDATE users SET session_version = session_version + 1 WHERE id = ?").bind(userId).run();
}

export async function countTradesByUser(db: D1Database, userId: string): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS count FROM trades WHERE user_id = ?").bind(userId).first<CountResult>();
  return Number(row?.count ?? 0);
}

export async function getTradeById(db: D1Database, tradeId: string, userId: string): Promise<TradeRow | null> {
  const result = await db
    .prepare("SELECT * FROM trades WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(tradeId, userId)
    .first<TradeRow>();

  return result ?? null;
}

export async function findUserIdBySubscriptionCustomer(db: D1Database, customerId: string): Promise<string | null> {
  const row = await db
    .prepare("SELECT user_id FROM subscriptions WHERE customer_id = ? ORDER BY updated_at DESC LIMIT 1")
    .bind(customerId)
    .first<{ user_id: string }>();
  return row?.user_id ?? null;
}

export async function getLatestSubscriptionByUser(db: D1Database, userId: string): Promise<SubscriptionRow | null> {
  const row = await db
    .prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1")
    .bind(userId)
    .first<SubscriptionRow>();
  return row ?? null;
}

export async function getRiskSettingsByUser(db: D1Database, userId: string): Promise<RiskSettingsRow | null> {
  const row = await db.prepare("SELECT * FROM risk_settings WHERE user_id = ? LIMIT 1").bind(userId).first<RiskSettingsRow>();
  return row ?? null;
}

export async function ensureRiskSettingsByUser(db: D1Database, userId: string): Promise<RiskSettingsRow> {
  const existing = await getRiskSettingsByUser(db, userId);
  if (existing) {
    return existing;
  }

  const timestamp = nowIso();
  await db
    .prepare(
      [
        "INSERT INTO risk_settings (user_id, enabled, daily_max_loss, max_consecutive_losses, cooldown_minutes, lockout_until, last_trigger_reason, created_at, updated_at)",
        "VALUES (?, 1, NULL, NULL, 45, NULL, NULL, ?, ?)"
      ].join(" ")
    )
    .bind(userId, timestamp, timestamp)
    .run();

  return {
    user_id: userId,
    enabled: 1,
    daily_max_loss: null,
    max_consecutive_losses: null,
    cooldown_minutes: 45,
    lockout_until: null,
    last_trigger_reason: null,
    created_at: timestamp,
    updated_at: timestamp
  };
}
