import { authConsumeSchema, authRequestLinkSchema } from "@tradevera/shared";
import type { Context } from "hono";
import type { AppEnv, AuthUser } from "./types";
import { createUser, getUserByEmail, getUserById, incrementUserSessionVersion } from "./utils/db";
import { sendMagicLinkEmail } from "./utils/email";
import { clearSessionCookie, createSessionCookie, parseCookie, signJwt, verifyJwt } from "./utils/jwt";
import { addMinutesIso, isTruthyEnv, nowIso, randomToken, sha256Hex } from "./utils/security";

interface LoginTokenRow {
  token_hash: string;
  user_email: string;
  expires_at: string;
  used: number;
}

export const SESSION_COOKIE_NAME = "tv_session";

const MAGIC_LINK_EXPIRY_MINUTES = 15;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function maskEmailForLogs(email: string): string {
  const [localPart, domainPart] = email.split("@");
  if (!localPart || !domainPart) {
    return "***";
  }

  const visiblePrefix = localPart.slice(0, 2);
  return `${visiblePrefix}***@${domainPart}`;
}

function shouldUseSecureCookie(requestUrl: string): boolean {
  const protocol = new URL(requestUrl).protocol;
  return protocol === "https:";
}

function unauthorizedResponse(c: Context<AppEnv>) {
  return c.json({ error: "Unauthorized" }, 401);
}

async function consumeMagicLinkToken(c: Context<AppEnv>, token: string) {
  const tokenHash = await sha256Hex(token);
  const tokenRow = await c.env.DB
    .prepare("SELECT token_hash, user_email, expires_at, used FROM login_tokens WHERE token_hash = ? LIMIT 1")
    .bind(tokenHash)
    .first<LoginTokenRow>();

  if (!tokenRow || tokenRow.used !== 0 || tokenRow.expires_at <= nowIso()) {
    return c.json({ error: "Login token is invalid or expired" }, 400);
  }

  const markUsedResult = await c.env.DB
    .prepare("UPDATE login_tokens SET used = 1 WHERE token_hash = ? AND used = 0")
    .bind(tokenHash)
    .run();

  if (!markUsedResult.success || Number(markUsedResult.meta.changes ?? 0) < 1) {
    return c.json({ error: "Login token already used" }, 400);
  }

  let user = await getUserByEmail(c.env.DB, tokenRow.user_email);
  if (!user) {
    user = await createUser(c.env.DB, tokenRow.user_email);
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const sessionToken = await signJwt(
    {
      sub: user.id,
      email: user.email,
      session_version: user.session_version,
      iat: nowSeconds,
      exp: nowSeconds + SESSION_MAX_AGE_SECONDS
    },
    c.env.JWT_SECRET
  );

  c.header(
    "Set-Cookie",
    createSessionCookie(SESSION_COOKIE_NAME, sessionToken, {
      secure: shouldUseSecureCookie(c.req.url),
      maxAgeSeconds: SESSION_MAX_AGE_SECONDS
    })
  );

  return c.json({ success: true, redirectTo: "/app/dashboard" });
}

export async function authenticateRequest(c: Context<AppEnv>): Promise<AuthUser | null> {
  const cookieHeader = c.req.header("Cookie");
  const sessionToken = parseCookie(cookieHeader, SESSION_COOKIE_NAME);
  if (!sessionToken) {
    return null;
  }

  const payload = await verifyJwt(sessionToken, c.env.JWT_SECRET);
  if (!payload) {
    return null;
  }

  const user = await getUserById(c.env.DB, payload.sub);
  if (!user || user.session_version !== payload.session_version) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    plan: user.plan,
    createdAt: user.created_at,
    sessionVersion: user.session_version
  };
}

export async function requireAuth(c: Context<AppEnv>): Promise<AuthUser | Response> {
  const preloaded = c.var.authUser;
  if (preloaded) {
    return preloaded;
  }

  const user = await authenticateRequest(c);
  if (!user) {
    return unauthorizedResponse(c);
  }

  c.set("authUser", user);
  return user;
}

export function registerAuthRoutes(app: import("hono").Hono<AppEnv>) {
  app.post("/auth/request-link", async (c) => {
    const parsedBody = authRequestLinkSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsedBody.success) {
      return c.json({ error: "Invalid email address" }, 400);
    }

    const { email } = parsedBody.data;
    const rawToken = randomToken(32);
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = addMinutesIso(MAGIC_LINK_EXPIRY_MINUTES);
    const createdAt = nowIso();

    await c.env.DB.prepare("DELETE FROM login_tokens WHERE expires_at < ? OR used = 1").bind(createdAt).run();
    await c.env.DB
      .prepare("INSERT INTO login_tokens (token_hash, user_email, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)")
      .bind(tokenHash, email, expiresAt, createdAt)
      .run();

    const appUrl = c.env.APP_URL.endsWith("/") ? c.env.APP_URL.slice(0, -1) : c.env.APP_URL;
    const magicLink = `${appUrl}/auth/callback?token=${encodeURIComponent(rawToken)}`;
    const requestHost = new URL(c.req.url).hostname;
    const allowMagicLinkInResponse =
      isTruthyEnv(c.env.ALLOW_MAGIC_LINK_IN_RESPONSE) || requestHost === "localhost" || requestHost === "127.0.0.1";

    let requestId: string | undefined;
    try {
      const delivery = await sendMagicLinkEmail(c.env, email, magicLink);
      requestId = delivery.id;
      console.info("magic_link_email_sent", {
        email: maskEmailForLogs(email),
        requestId: delivery.id
      });
    } catch (error) {
      console.error("Failed to send magic link email", error);
      if (allowMagicLinkInResponse) {
        return c.json({
          success: true,
          message: "Email delivery failed; using local debug link.",
          magicLink,
          delivery: "debug"
        });
      }

      return c.json({ error: "Unable to send login email right now" }, 502);
    }

    return c.json({ success: true, message: "Magic link sent", delivery: "email", requestId });
  });

  app.post("/auth/consume", async (c) => {
    const parsedBody = authConsumeSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsedBody.success) {
      return c.json({ error: "Missing token" }, 400);
    }

    return consumeMagicLinkToken(c, parsedBody.data.token);
  });

  app.get("/auth/consume", async (c) => {
    const token = c.req.query("token");
    if (!token) {
      return c.json({ error: "Missing token" }, 400);
    }

    return consumeMagicLinkToken(c, token);
  });

  app.post("/api/logout", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    await incrementUserSessionVersion(c.env.DB, auth.id);

    c.header("Set-Cookie", clearSessionCookie(SESSION_COOKIE_NAME, shouldUseSecureCookie(c.req.url)));
    return c.json({ success: true });
  });
}
