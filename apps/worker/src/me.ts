import type { Hono } from "hono";
import type { AppEnv } from "./types";
import { requireAuth } from "./auth";
import { countTradesByUser } from "./utils/db";
import { FREE_PLAN_MAX_DAYS, FREE_TRADE_LIMIT, freeDaysRemaining, freeExpiryDate } from "./utils/plan";

export function registerMeRoutes(app: Hono<AppEnv>) {
  app.get("/api/me", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const tradeCount = await countTradesByUser(c.env.DB, auth.id);
    const freeRemaining = auth.plan === "free" ? freeDaysRemaining(auth.createdAt) : null;
    const freeExpiresAt = auth.plan === "free" ? freeExpiryDate(auth.createdAt).toISOString() : null;

    return c.json({
      user: {
        id: auth.id,
        email: auth.email,
        plan: auth.plan,
        tradeCount,
        tradeLimit: auth.plan === "free" ? FREE_TRADE_LIMIT : null,
        freeDaysTotal: auth.plan === "free" ? FREE_PLAN_MAX_DAYS : null,
        freeDaysRemaining: freeRemaining,
        freeExpiresAt,
        freeExpired: auth.plan === "free" ? freeRemaining === 0 : false,
        canUseProFeatures: auth.plan === "pro"
      }
    });
  });
}
