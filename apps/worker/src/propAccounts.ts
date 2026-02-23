import { propFirmAccountSchema, propFirmAccountUpdateSchema } from "@tradevera/shared";
import type { Hono } from "hono";
import { requireAuth } from "./auth";
import type { AppEnv } from "./types";
import { normalizeNullableNumber, normalizeNullableString, nowIso } from "./utils/security";

interface PropFirmAccountRow {
  id: string;
  user_id: string;
  name: string;
  platform:
    | "topstep"
    | "alpha_futures"
    | "lucid_trading"
    | "tradeify"
    | "apex_trader"
    | "take_profit_trader"
    | "my_funded_futures"
    | "custom";
  custom_platform_name: string | null;
  account_size: "50K" | "100K" | "150K" | "custom";
  is_copy_trading: number;
  copy_group_key: string | null;
  copy_group_name: string | null;
  is_group_leader: number;
  profit_target: number | null;
  max_position_size: number | null;
  daily_loss_limit: number | null;
  max_drawdown: number | null;
  drawdown_mode: "fixed" | "trailing";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function serializePropFirmAccount(row: PropFirmAccountRow) {
  return {
    ...row,
    is_copy_trading: row.is_copy_trading === 1,
    is_group_leader: row.is_group_leader === 1
  };
}

function slugifyGroupKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeCopyFields(input: {
  is_copy_trading: boolean;
  copy_group_key?: string | null;
  copy_group_name?: string | null;
  is_group_leader?: boolean;
}) {
  if (!input.is_copy_trading) {
    return {
      is_copy_trading: 0,
      copy_group_key: null,
      copy_group_name: null,
      is_group_leader: 0
    };
  }

  const groupName = normalizeNullableString(input.copy_group_name) ?? normalizeNullableString(input.copy_group_key);
  const groupKeyCandidate = normalizeNullableString(input.copy_group_key) ?? groupName;
  const groupKey = groupKeyCandidate ? slugifyGroupKey(groupKeyCandidate) : null;

  return {
    is_copy_trading: 1,
    copy_group_key: groupKey,
    copy_group_name: groupName,
    is_group_leader: input.is_group_leader ? 1 : 0
  };
}

async function getPropFirmAccountById(db: D1Database, id: string, userId: string): Promise<PropFirmAccountRow | null> {
  const row = await db
    .prepare("SELECT * FROM prop_firm_accounts WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(id, userId)
    .first<PropFirmAccountRow>();
  return row ?? null;
}

export function registerPropAccountRoutes(app: Hono<AppEnv>) {
  app.get("/api/prop-accounts", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const rows = await c.env.DB
      .prepare(
        [
          "SELECT * FROM prop_firm_accounts WHERE user_id = ?",
          "ORDER BY",
          "CASE WHEN is_copy_trading = 1 THEN 0 ELSE 1 END,",
          "COALESCE(copy_group_name, ''),",
          "updated_at DESC"
        ].join(" ")
      )
      .bind(auth.id)
      .all<PropFirmAccountRow>();

    return c.json({ accounts: (rows.results ?? []).map(serializePropFirmAccount) });
  });

  app.post("/api/prop-accounts", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = propFirmAccountSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ error: "Invalid prop firm account payload", details: parsed.error.flatten() }, 400);
    }

    const timestamp = nowIso();
    const copyFields = normalizeCopyFields({
      is_copy_trading: parsed.data.is_copy_trading ?? false,
      copy_group_key: parsed.data.copy_group_key ?? null,
      copy_group_name: parsed.data.copy_group_name ?? null,
      is_group_leader: parsed.data.is_group_leader ?? false
    });

    const row: PropFirmAccountRow = {
      id: crypto.randomUUID(),
      user_id: auth.id,
      name: parsed.data.name.trim(),
      platform: parsed.data.platform,
      custom_platform_name: parsed.data.platform === "custom" ? normalizeNullableString(parsed.data.custom_platform_name) : null,
      account_size: parsed.data.account_size ?? "custom",
      ...copyFields,
      profit_target: normalizeNullableNumber(parsed.data.profit_target),
      max_position_size: normalizeNullableNumber(parsed.data.max_position_size),
      daily_loss_limit: normalizeNullableNumber(parsed.data.daily_loss_limit),
      max_drawdown: normalizeNullableNumber(parsed.data.max_drawdown),
      drawdown_mode: parsed.data.drawdown_mode ?? "fixed",
      notes: normalizeNullableString(parsed.data.notes),
      created_at: timestamp,
      updated_at: timestamp
    };

    await c.env.DB
      .prepare(
        [
          "INSERT INTO prop_firm_accounts (",
          "id, user_id, name, platform, custom_platform_name, account_size,",
          "is_copy_trading, copy_group_key, copy_group_name, is_group_leader,",
          "profit_target, max_position_size, daily_loss_limit, max_drawdown, drawdown_mode, notes,",
          "created_at, updated_at",
          ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .bind(
        row.id,
        row.user_id,
        row.name,
        row.platform,
        row.custom_platform_name,
        row.account_size,
        row.is_copy_trading,
        row.copy_group_key,
        row.copy_group_name,
        row.is_group_leader,
        row.profit_target,
        row.max_position_size,
        row.daily_loss_limit,
        row.max_drawdown,
        row.drawdown_mode,
        row.notes,
        row.created_at,
        row.updated_at
      )
      .run();

    return c.json({ account: serializePropFirmAccount(row) }, 201);
  });

  app.put("/api/prop-accounts/:id", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const accountId = c.req.param("id");
    const existing = await getPropFirmAccountById(c.env.DB, accountId, auth.id);
    if (!existing) {
      return c.json({ error: "Prop firm account not found" }, 404);
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = propFirmAccountUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ error: "Invalid prop firm account payload", details: parsed.error.flatten() }, 400);
    }

    if (Object.keys(parsed.data).length === 0) {
      return c.json({ error: "No account fields supplied" }, 400);
    }

    const nextIsCopyTrading = parsed.data.is_copy_trading ?? (existing.is_copy_trading === 1);
    const copyFields = normalizeCopyFields({
      is_copy_trading: nextIsCopyTrading,
      copy_group_key: parsed.data.copy_group_key === undefined ? existing.copy_group_key : parsed.data.copy_group_key,
      copy_group_name: parsed.data.copy_group_name === undefined ? existing.copy_group_name : parsed.data.copy_group_name,
      is_group_leader: parsed.data.is_group_leader ?? (existing.is_group_leader === 1)
    });

    const nextPlatform = parsed.data.platform ?? existing.platform;
    const nextCustomPlatformName =
      nextPlatform === "custom"
        ? parsed.data.custom_platform_name === undefined
          ? existing.custom_platform_name
          : normalizeNullableString(parsed.data.custom_platform_name)
        : null;

    const updated: PropFirmAccountRow = {
      ...existing,
      name: parsed.data.name?.trim() ?? existing.name,
      platform: nextPlatform,
      custom_platform_name: nextCustomPlatformName,
      account_size: parsed.data.account_size ?? existing.account_size,
      ...copyFields,
      profit_target:
        parsed.data.profit_target === undefined ? existing.profit_target : normalizeNullableNumber(parsed.data.profit_target),
      max_position_size:
        parsed.data.max_position_size === undefined ? existing.max_position_size : normalizeNullableNumber(parsed.data.max_position_size),
      daily_loss_limit:
        parsed.data.daily_loss_limit === undefined ? existing.daily_loss_limit : normalizeNullableNumber(parsed.data.daily_loss_limit),
      max_drawdown:
        parsed.data.max_drawdown === undefined ? existing.max_drawdown : normalizeNullableNumber(parsed.data.max_drawdown),
      drawdown_mode: parsed.data.drawdown_mode ?? existing.drawdown_mode,
      notes: parsed.data.notes === undefined ? existing.notes : normalizeNullableString(parsed.data.notes),
      updated_at: nowIso()
    };

    await c.env.DB
      .prepare(
        [
          "UPDATE prop_firm_accounts SET",
          "name = ?, platform = ?, custom_platform_name = ?, account_size = ?,",
          "is_copy_trading = ?, copy_group_key = ?, copy_group_name = ?, is_group_leader = ?,",
          "profit_target = ?, max_position_size = ?, daily_loss_limit = ?, max_drawdown = ?, drawdown_mode = ?, notes = ?, updated_at = ?",
          "WHERE id = ? AND user_id = ?"
        ].join(" ")
      )
      .bind(
        updated.name,
        updated.platform,
        updated.custom_platform_name,
        updated.account_size,
        updated.is_copy_trading,
        updated.copy_group_key,
        updated.copy_group_name,
        updated.is_group_leader,
        updated.profit_target,
        updated.max_position_size,
        updated.daily_loss_limit,
        updated.max_drawdown,
        updated.drawdown_mode,
        updated.notes,
        updated.updated_at,
        accountId,
        auth.id
      )
      .run();

    return c.json({ account: serializePropFirmAccount(updated) });
  });

  app.delete("/api/prop-accounts/:id", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const accountId = c.req.param("id");
    const result = await c.env.DB.prepare("DELETE FROM prop_firm_accounts WHERE id = ? AND user_id = ?").bind(accountId, auth.id).run();
    if (!result.success || Number(result.meta.changes ?? 0) === 0) {
      return c.json({ error: "Prop firm account not found" }, 404);
    }

    return c.json({ success: true });
  });
}
