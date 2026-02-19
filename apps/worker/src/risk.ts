import { riskSettingsSchema } from "@tradevera/shared";
import type { Hono } from "hono";
import type { AppEnv } from "./types";
import { requireAuth } from "./auth";
import { ensureRiskSettingsByUser, getRiskSettingsByUser, type RiskSettingsRow } from "./utils/db";
import { nowIso } from "./utils/security";

function serializeSettings(settings: RiskSettingsRow) {
  return {
    ...settings,
    enabled: settings.enabled === 1
  };
}

function computeStatus(settings: RiskSettingsRow) {
  const isLocked = Boolean(settings.lockout_until && new Date(settings.lockout_until).getTime() > Date.now());
  return {
    isLocked,
    lockoutUntil: isLocked ? settings.lockout_until : null,
    reason: isLocked ? settings.last_trigger_reason : null
  };
}

export function registerRiskRoutes(app: Hono<AppEnv>) {
  app.get("/api/risk-settings", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const settings = await ensureRiskSettingsByUser(c.env.DB, auth.id);
    return c.json({
      settings: serializeSettings(settings),
      status: computeStatus(settings)
    });
  });

  app.put("/api/risk-settings", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = riskSettingsSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ error: "Invalid risk settings payload", details: parsed.error.flatten() }, 400);
    }

    const existing = await ensureRiskSettingsByUser(c.env.DB, auth.id);
    const next = {
      enabled: parsed.data.enabled ?? existing.enabled === 1,
      daily_max_loss: parsed.data.daily_max_loss === undefined ? existing.daily_max_loss : parsed.data.daily_max_loss,
      max_consecutive_losses:
        parsed.data.max_consecutive_losses === undefined
          ? existing.max_consecutive_losses
          : parsed.data.max_consecutive_losses,
      cooldown_minutes: parsed.data.cooldown_minutes ?? existing.cooldown_minutes,
      lockout_until: parsed.data.enabled === false ? null : existing.lockout_until,
      last_trigger_reason: parsed.data.enabled === false ? null : existing.last_trigger_reason
    };

    const updatedAt = nowIso();
    await c.env.DB
      .prepare(
        [
          "UPDATE risk_settings SET",
          "enabled = ?, daily_max_loss = ?, max_consecutive_losses = ?, cooldown_minutes = ?,",
          "lockout_until = ?, last_trigger_reason = ?, updated_at = ?",
          "WHERE user_id = ?"
        ].join(" ")
      )
      .bind(
        next.enabled ? 1 : 0,
        next.daily_max_loss,
        next.max_consecutive_losses,
        next.cooldown_minutes,
        next.lockout_until,
        next.last_trigger_reason,
        updatedAt,
        auth.id
      )
      .run();

    const refreshed = (await getRiskSettingsByUser(c.env.DB, auth.id)) ?? existing;
    return c.json({
      settings: serializeSettings(refreshed),
      status: computeStatus(refreshed)
    });
  });

  app.post("/api/risk-settings/unlock", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    await ensureRiskSettingsByUser(c.env.DB, auth.id);
    const updatedAt = nowIso();
    await c.env.DB
      .prepare("UPDATE risk_settings SET lockout_until = NULL, last_trigger_reason = NULL, updated_at = ? WHERE user_id = ?")
      .bind(updatedAt, auth.id)
      .run();

    const settings = await ensureRiskSettingsByUser(c.env.DB, auth.id);
    return c.json({
      settings: serializeSettings(settings),
      status: computeStatus(settings)
    });
  });
}
