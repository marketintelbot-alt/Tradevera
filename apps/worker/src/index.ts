import { Hono } from "hono";
import { registerAiRoutes } from "./ai";
import { authenticateRequest, registerAuthRoutes } from "./auth";
import { registerMeRoutes } from "./me";
import { registerProjectRoutes } from "./projects";
import { registerRiskRoutes } from "./risk";
import { registerHealthRoute } from "./routes";
import { registerStripeRoutes } from "./stripe";
import { registerTradeRoutes } from "./trades";
import type { AppEnv } from "./types";
import { isFreeExpired } from "./utils/plan";

const PUBLIC_API_ROUTES = new Set(["/api/stripe/webhook", "/api/stripe/create-checkout-session"]);
const FREE_EXEMPT_ROUTES = new Set(["/api/me", "/api/logout", "/api/stripe/create-checkout-session"]);
const FREE_READ_ONLY_ROUTES = new Set(["/api/trades", "/api/projects", "/api/tasks"]);

const app = new Hono<AppEnv>();

function toOrigin(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return null;
  }
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function resolveAllowedOrigins(frontendOriginVar: string, appUrlVar: string): string[] {
  const fromFrontend = frontendOriginVar
    .split(",")
    .map((origin) => toOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));
  const appOrigin = toOrigin(appUrlVar);
  if (appOrigin && !fromFrontend.includes(appOrigin)) {
    fromFrontend.push(appOrigin);
  }
  return fromFrontend;
}

app.use("*", async (c, next) => {
  const requestOrigin = c.req.header("Origin");
  const allowedOrigins = resolveAllowedOrigins(c.env.FRONTEND_ORIGIN, c.env.APP_URL);
  const method = c.req.method;

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    c.header("Access-Control-Allow-Origin", requestOrigin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Stripe-Signature");
    c.header("Vary", "Origin");
  }

  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }

  const isStateChangingMethod = method !== "GET" && method !== "HEAD";
  if (isStateChangingMethod && requestOrigin && !allowedOrigins.includes(requestOrigin)) {
    return c.json({ error: "Origin not allowed" }, 403);
  }

  await next();
});

app.use("/api/*", async (c, next) => {
  if (PUBLIC_API_ROUTES.has(c.req.path)) {
    await next();
    return;
  }

  const authUser = await authenticateRequest(c);
  if (!authUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const isAllowedReadOnly = c.req.method === "GET" && FREE_READ_ONLY_ROUTES.has(c.req.path);

  if (isFreeExpired(authUser) && !FREE_EXEMPT_ROUTES.has(c.req.path) && !isAllowedReadOnly) {
    return c.json(
      {
        error: "Free plan access expired after 50 days. Upgrade to Starter or Pro to continue using Tradevera."
      },
      402
    );
  }

  c.set("authUser", authUser);
  await next();
});

registerHealthRoute(app);
registerAuthRoutes(app);
registerMeRoutes(app);
registerTradeRoutes(app);
registerProjectRoutes(app);
registerRiskRoutes(app);
registerAiRoutes(app);
registerStripeRoutes(app);

app.notFound((c) => c.json({ error: "Route not found" }, 404));
app.onError((error, c) => {
  console.error("Unhandled worker error", error);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
