import { tradeSchema, tradeScreenshotSchema, tradeListQuerySchema, tradeUpdateSchema } from "@tradevera/shared";
import type { Hono } from "hono";
import type { AppEnv } from "./types";
import { requireAuth } from "./auth";
import { countTradesByUser, ensureRiskSettingsByUser, getTradeById, type TradeRow } from "./utils/db";
import { FREE_TRADE_LIMIT } from "./utils/plan";
import { normalizeNullableNumber, normalizeNullableString, nowIso } from "./utils/security";

const MAX_SCREENSHOTS_PER_TRADE = 6;
const MAX_SCREENSHOT_BYTES = 1_400_000;

type RiskTriggerReason = "daily_max_loss" | "loss_streak" | "combined";

interface TradeScreenshotRow {
  id: string;
  trade_id: string;
  user_id: string;
  image_data: string;
  caption: string | null;
  created_at: string;
}

function toBoolean(value: number): boolean {
  return value === 1;
}

function serializeTrade(row: TradeRow) {
  return {
    ...row,
    plan_adherence: toBoolean(row.plan_adherence)
  };
}

function computePnl(input: {
  direction: "long" | "short";
  entry_price: number;
  exit_price: number | null;
  size: number;
  fees: number;
}): number | null {
  if (input.exit_price === null) {
    return null;
  }

  const gross = input.direction === "long" ? (input.exit_price - input.entry_price) * input.size : (input.entry_price - input.exit_price) * input.size;
  const net = gross - input.fees;
  return Number(net.toFixed(4));
}

function isLockoutActive(lockoutUntil: string | null): boolean {
  if (!lockoutUntil) {
    return false;
  }
  const ts = new Date(lockoutUntil).getTime();
  if (Number.isNaN(ts)) {
    return false;
  }
  return ts > Date.now();
}

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((base64.length * 3) / 4);
}

async function evaluateRiskGuardrail(
  db: D1Database,
  userId: string,
  openedAt: string,
  settings: {
    daily_max_loss: number | null;
    max_consecutive_losses: number | null;
    cooldown_minutes: number;
  }
): Promise<{ triggered: false } | { triggered: true; reason: RiskTriggerReason; lockoutUntil: string }> {
  const dailyRow = await db
    .prepare("SELECT COALESCE(SUM(pnl), 0) AS total FROM trades WHERE user_id = ? AND pnl IS NOT NULL AND date(opened_at) = date(?)")
    .bind(userId, openedAt)
    .first<{ total: number }>();

  const dailyPnl = Number(dailyRow?.total ?? 0);
  const dailyTriggered =
    settings.daily_max_loss !== null &&
    Number.isFinite(settings.daily_max_loss) &&
    dailyPnl <= -Math.abs(settings.daily_max_loss);

  const recentRows = await db
    .prepare("SELECT pnl FROM trades WHERE user_id = ? AND pnl IS NOT NULL ORDER BY opened_at DESC, created_at DESC LIMIT 60")
    .bind(userId)
    .all<{ pnl: number }>();

  let lossStreak = 0;
  for (const row of recentRows.results ?? []) {
    const pnl = Number(row.pnl ?? 0);
    if (pnl < 0) {
      lossStreak += 1;
      continue;
    }
    break;
  }

  const streakTriggered =
    settings.max_consecutive_losses !== null &&
    Number.isFinite(settings.max_consecutive_losses) &&
    lossStreak >= Math.max(1, Math.floor(settings.max_consecutive_losses));

  if (!dailyTriggered && !streakTriggered) {
    return { triggered: false };
  }

  const reason: RiskTriggerReason =
    dailyTriggered && streakTriggered ? "combined" : dailyTriggered ? "daily_max_loss" : "loss_streak";
  const cooldownMinutes = Math.max(1, Math.floor(settings.cooldown_minutes || 45));
  const lockoutUntil = new Date(Date.now() + cooldownMinutes * 60_000).toISOString();

  return {
    triggered: true,
    reason,
    lockoutUntil
  };
}

function normalizeTradePayload(data: Record<string, unknown>) {
  return {
    opened_at: data.opened_at as string,
    closed_at: (data.closed_at as string | null | undefined) ?? null,
    symbol: String(data.symbol ?? "").trim().toUpperCase(),
    asset_class: data.asset_class as "stocks" | "options" | "futures" | "crypto" | "forex",
    direction: data.direction as "long" | "short",
    entry_price: Number(data.entry_price),
    exit_price: normalizeNullableNumber(data.exit_price),
    size: Number(data.size),
    fees: Number(data.fees ?? 0),
    r_multiple: normalizeNullableNumber(data.r_multiple),
    setup: normalizeNullableString(data.setup),
    timeframe: normalizeNullableString(data.timeframe),
    session: (data.session as "Asia" | "London" | "NY" | null | undefined) ?? null,
    confidence: normalizeNullableNumber(data.confidence),
    plan_adherence: Boolean(data.plan_adherence),
    notes: normalizeNullableString(data.notes),
    mistakes: normalizeNullableString(data.mistakes)
  };
}

export function registerTradeRoutes(app: Hono<AppEnv>) {
  app.get("/api/trades", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const query = {
      search: c.req.query("search"),
      symbol: c.req.query("symbol"),
      from: c.req.query("from"),
      to: c.req.query("to"),
      setup: c.req.query("setup")
    };

    const parsedQuery = tradeListQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      return c.json({ error: "Invalid query parameters" }, 400);
    }

    const sqlParts: string[] = ["SELECT * FROM trades WHERE user_id = ?"];
    const bindings: unknown[] = [auth.id];

    const { search, symbol, from, to, setup } = parsedQuery.data;

    if (symbol) {
      sqlParts.push("AND symbol = ?");
      bindings.push(symbol);
    }

    if (setup) {
      sqlParts.push("AND setup = ?");
      bindings.push(setup);
    }

    if (from) {
      sqlParts.push("AND opened_at >= ?");
      bindings.push(from);
    }

    if (to) {
      sqlParts.push("AND opened_at <= ?");
      bindings.push(to);
    }

    if (search) {
      sqlParts.push("AND (symbol LIKE ? OR setup LIKE ? OR notes LIKE ? OR mistakes LIKE ?)");
      const wildcard = `%${search}%`;
      bindings.push(wildcard, wildcard, wildcard, wildcard);
    }

    sqlParts.push("ORDER BY opened_at DESC, created_at DESC");

    const rows = await c.env.DB.prepare(sqlParts.join(" ")).bind(...bindings).all<TradeRow>();

    return c.json({
      trades: (rows.results ?? []).map((trade) => serializeTrade(trade))
    });
  });

  app.post("/api/trades", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    if (auth.plan === "free") {
      const tradeCount = await countTradesByUser(c.env.DB, auth.id);
      if (tradeCount >= FREE_TRADE_LIMIT) {
        return c.json({ error: "Free plan limited to 50 trades. Upgrade to Pro." }, 402);
      }
    }

    const riskSettings = await ensureRiskSettingsByUser(c.env.DB, auth.id);
    if (riskSettings.enabled === 1 && isLockoutActive(riskSettings.lockout_until)) {
      return c.json(
        {
          error: "Risk guardrail lockout active. Pause trading until lockout expires.",
          lockoutUntil: riskSettings.lockout_until,
          reason: riskSettings.last_trigger_reason
        },
        423
      );
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = tradeSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ error: "Invalid trade payload", details: parsed.error.flatten() }, 400);
    }

    const trade = normalizeTradePayload(parsed.data as Record<string, unknown>);
    const id = crypto.randomUUID();
    const timestamp = nowIso();
    const pnl = computePnl(trade);

    const inserted: TradeRow = {
      id,
      user_id: auth.id,
      opened_at: trade.opened_at,
      closed_at: trade.closed_at,
      symbol: trade.symbol,
      asset_class: trade.asset_class,
      direction: trade.direction,
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      size: trade.size,
      fees: trade.fees,
      pnl,
      r_multiple: trade.r_multiple,
      setup: trade.setup,
      timeframe: trade.timeframe,
      session: trade.session,
      confidence: trade.confidence,
      plan_adherence: trade.plan_adherence ? 1 : 0,
      notes: trade.notes,
      mistakes: trade.mistakes,
      created_at: timestamp,
      updated_at: timestamp
    };

    await c.env.DB
      .prepare(
        [
          "INSERT INTO trades (",
          "id, user_id, opened_at, closed_at, symbol, asset_class, direction,",
          "entry_price, exit_price, size, fees, pnl, r_multiple, setup, timeframe, session,",
          "confidence, plan_adherence, notes, mistakes, created_at, updated_at",
          ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .bind(
        inserted.id,
        inserted.user_id,
        inserted.opened_at,
        inserted.closed_at,
        inserted.symbol,
        inserted.asset_class,
        inserted.direction,
        inserted.entry_price,
        inserted.exit_price,
        inserted.size,
        inserted.fees,
        inserted.pnl,
        inserted.r_multiple,
        inserted.setup,
        inserted.timeframe,
        inserted.session,
        inserted.confidence,
        inserted.plan_adherence,
        inserted.notes,
        inserted.mistakes,
        inserted.created_at,
        inserted.updated_at
      )
      .run();

    let riskTriggered: { reason: RiskTriggerReason; lockoutUntil: string } | undefined;
    if (riskSettings.enabled === 1) {
      const evaluation = await evaluateRiskGuardrail(c.env.DB, auth.id, inserted.opened_at, {
        daily_max_loss: riskSettings.daily_max_loss,
        max_consecutive_losses: riskSettings.max_consecutive_losses,
        cooldown_minutes: riskSettings.cooldown_minutes
      });

      if (evaluation.triggered) {
        riskTriggered = {
          reason: evaluation.reason,
          lockoutUntil: evaluation.lockoutUntil
        };
        await c.env.DB
          .prepare("UPDATE risk_settings SET lockout_until = ?, last_trigger_reason = ?, updated_at = ? WHERE user_id = ?")
          .bind(evaluation.lockoutUntil, evaluation.reason, nowIso(), auth.id)
          .run();
      }
    }

    return c.json({ trade: serializeTrade(inserted), riskTriggered }, 201);
  });

  app.put("/api/trades/:id", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const tradeId = c.req.param("id");
    const existing = await getTradeById(c.env.DB, tradeId, auth.id);
    if (!existing) {
      return c.json({ error: "Trade not found" }, 404);
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = tradeUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ error: "Invalid trade payload", details: parsed.error.flatten() }, 400);
    }

    const providedKeys = Object.keys(parsed.data).filter((key) => key !== "id");
    if (providedKeys.length === 0) {
      return c.json({ error: "No trade fields supplied" }, 400);
    }

    const normalizedInput = normalizeTradePayload({
      ...existing,
      ...parsed.data,
      plan_adherence:
        parsed.data.plan_adherence === undefined
          ? existing.plan_adherence === 1
          : parsed.data.plan_adherence
    } as Record<string, unknown>);

    const updatedAt = nowIso();
    const pnl = computePnl(normalizedInput);

    const updatedRow: TradeRow = {
      ...existing,
      opened_at: normalizedInput.opened_at,
      closed_at: normalizedInput.closed_at,
      symbol: normalizedInput.symbol,
      asset_class: normalizedInput.asset_class,
      direction: normalizedInput.direction,
      entry_price: normalizedInput.entry_price,
      exit_price: normalizedInput.exit_price,
      size: normalizedInput.size,
      fees: normalizedInput.fees,
      pnl,
      r_multiple: normalizedInput.r_multiple,
      setup: normalizedInput.setup,
      timeframe: normalizedInput.timeframe,
      session: normalizedInput.session,
      confidence: normalizedInput.confidence,
      plan_adherence: normalizedInput.plan_adherence ? 1 : 0,
      notes: normalizedInput.notes,
      mistakes: normalizedInput.mistakes,
      updated_at: updatedAt
    };

    await c.env.DB
      .prepare(
        [
          "UPDATE trades SET",
          "opened_at = ?, closed_at = ?, symbol = ?, asset_class = ?, direction = ?,",
          "entry_price = ?, exit_price = ?, size = ?, fees = ?, pnl = ?, r_multiple = ?,",
          "setup = ?, timeframe = ?, session = ?, confidence = ?, plan_adherence = ?,",
          "notes = ?, mistakes = ?, updated_at = ?",
          "WHERE id = ? AND user_id = ?"
        ].join(" ")
      )
      .bind(
        updatedRow.opened_at,
        updatedRow.closed_at,
        updatedRow.symbol,
        updatedRow.asset_class,
        updatedRow.direction,
        updatedRow.entry_price,
        updatedRow.exit_price,
        updatedRow.size,
        updatedRow.fees,
        updatedRow.pnl,
        updatedRow.r_multiple,
        updatedRow.setup,
        updatedRow.timeframe,
        updatedRow.session,
        updatedRow.confidence,
        updatedRow.plan_adherence,
        updatedRow.notes,
        updatedRow.mistakes,
        updatedRow.updated_at,
        tradeId,
        auth.id
      )
      .run();

    return c.json({ trade: serializeTrade(updatedRow) });
  });

  app.delete("/api/trades/:id", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const tradeId = c.req.param("id");
    await c.env.DB.prepare("DELETE FROM trade_screenshots WHERE trade_id = ? AND user_id = ?").bind(tradeId, auth.id).run();
    const result = await c.env.DB.prepare("DELETE FROM trades WHERE id = ? AND user_id = ?").bind(tradeId, auth.id).run();

    if (!result.success || Number(result.meta.changes ?? 0) === 0) {
      return c.json({ error: "Trade not found" }, 404);
    }

    return c.json({ success: true });
  });

  app.get("/api/trades/:id/screenshots", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const tradeId = c.req.param("id");
    const trade = await getTradeById(c.env.DB, tradeId, auth.id);
    if (!trade) {
      return c.json({ error: "Trade not found" }, 404);
    }

    const rows = await c.env.DB
      .prepare("SELECT id, trade_id, user_id, image_data, caption, created_at FROM trade_screenshots WHERE trade_id = ? AND user_id = ? ORDER BY created_at DESC")
      .bind(tradeId, auth.id)
      .all<TradeScreenshotRow>();

    return c.json({
      screenshots: rows.results ?? []
    });
  });

  app.post("/api/trades/:id/screenshots", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const tradeId = c.req.param("id");
    const trade = await getTradeById(c.env.DB, tradeId, auth.id);
    if (!trade) {
      return c.json({ error: "Trade not found" }, 404);
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = tradeScreenshotSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ error: "Invalid screenshot payload", details: parsed.error.flatten() }, 400);
    }

    const countRow = await c.env.DB
      .prepare("SELECT COUNT(*) AS count FROM trade_screenshots WHERE trade_id = ? AND user_id = ?")
      .bind(tradeId, auth.id)
      .first<{ count: number }>();

    const screenshotCount = Number(countRow?.count ?? 0);
    if (screenshotCount >= MAX_SCREENSHOTS_PER_TRADE) {
      return c.json({ error: `Maximum ${MAX_SCREENSHOTS_PER_TRADE} screenshots allowed per trade.` }, 400);
    }

    const bytes = estimateDataUrlBytes(parsed.data.image_data);
    if (bytes > MAX_SCREENSHOT_BYTES) {
      return c.json({ error: "Screenshot too large. Compress image and try again." }, 413);
    }

    const screenshot: TradeScreenshotRow = {
      id: crypto.randomUUID(),
      trade_id: tradeId,
      user_id: auth.id,
      image_data: parsed.data.image_data,
      caption: normalizeNullableString(parsed.data.caption),
      created_at: nowIso()
    };

    await c.env.DB
      .prepare("INSERT INTO trade_screenshots (id, trade_id, user_id, image_data, caption, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(screenshot.id, screenshot.trade_id, screenshot.user_id, screenshot.image_data, screenshot.caption, screenshot.created_at)
      .run();

    return c.json({ screenshot }, 201);
  });

  app.delete("/api/trades/:id/screenshots/:screenshotId", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const tradeId = c.req.param("id");
    const screenshotId = c.req.param("screenshotId");
    const result = await c.env.DB
      .prepare("DELETE FROM trade_screenshots WHERE id = ? AND trade_id = ? AND user_id = ?")
      .bind(screenshotId, tradeId, auth.id)
      .run();

    if (!result.success || Number(result.meta.changes ?? 0) === 0) {
      return c.json({ error: "Screenshot not found" }, 404);
    }

    return c.json({ success: true });
  });
}
