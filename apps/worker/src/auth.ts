import {
  authConsumeSchema,
  authPasswordLoginSchema,
  authRequestLinkSchema,
  authRequestPasswordSchema
} from "@tradevera/shared";
import type { Context } from "hono";
import type { AppEnv, AuthUser } from "./types";
import { createUser, getUserByEmail, getUserById, incrementUserSessionVersion, type UserRow } from "./utils/db";
import { sendMagicLinkEmail, sendPasswordCredentialsEmail } from "./utils/email";
import { clearSessionCookie, createSessionCookie, parseCookie, signJwt, verifyJwt } from "./utils/jwt";
import { isLifetimeProEmail } from "./utils/lifetime";
import {
  addMinutesIso,
  generateReadablePassword,
  hashPassword,
  isTruthyEnv,
  nowIso,
  randomToken,
  sha256Hex,
  verifyPassword
} from "./utils/security";

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

function sessionSameSite(requestUrl: string, requestOrigin: string | undefined): "Lax" | "None" {
  const secure = shouldUseSecureCookie(requestUrl);
  if (!secure) {
    return "Lax";
  }

  if (!requestOrigin) {
    return "Lax";
  }

  try {
    const requestUrlOrigin = new URL(requestUrl).origin;
    return requestOrigin === requestUrlOrigin ? "Lax" : "None";
  } catch {
    return "Lax";
  }
}

function shouldAllowDebugResponse(c: Context<AppEnv>): boolean {
  const requestHost = new URL(c.req.url).hostname;
  return isTruthyEnv(c.env.ALLOW_MAGIC_LINK_IN_RESPONSE) || requestHost === "localhost" || requestHost === "127.0.0.1";
}

async function ensureLifetimePro(c: Context<AppEnv>, user: UserRow): Promise<UserRow> {
  if (!isLifetimeProEmail(c.env, user.email) || user.plan === "pro") {
    return user;
  }

  await c.env.DB.prepare("UPDATE users SET plan = 'pro' WHERE id = ?").bind(user.id).run();
  return {
    ...user,
    plan: "pro"
  };
}

function shouldIncludeSessionFallbackToken(c: Context<AppEnv>): boolean {
  try {
    const appOrigin = new URL(c.env.APP_URL).origin;
    const requestOrigin = new URL(c.req.url).origin;
    if (appOrigin !== requestOrigin) {
      return true;
    }
  } catch {
    // Fallback to request header inference below.
  }

  return sessionSameSite(c.req.url, c.req.header("Origin")) === "None";
}

async function setSessionCookie(c: Context<AppEnv>, user: UserRow): Promise<string> {
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

  const secure = shouldUseSecureCookie(c.req.url);
  const sameSite = sessionSameSite(c.req.url, c.req.header("Origin"));
  c.header(
    "Set-Cookie",
    createSessionCookie(SESSION_COOKIE_NAME, sessionToken, {
      secure,
      sameSite,
      maxAgeSeconds: SESSION_MAX_AGE_SECONDS
    })
  );

  return sessionToken;
}

interface ProvisionPasswordResult {
  passwordProvisioned: boolean;
  passwordDelivery: "email" | "debug" | null;
  temporaryPassword?: string;
}

async function provisionPasswordForUser(c: Context<AppEnv>, user: UserRow): Promise<ProvisionPasswordResult> {
  if (user.password_hash) {
    return { passwordProvisioned: false, passwordDelivery: null };
  }

  const temporaryPassword = generateReadablePassword(14);
  const passwordHash = await hashPassword(temporaryPassword);
  const passwordUpdatedAt = nowIso();
  const allowDebug = shouldAllowDebugResponse(c);

  const setPasswordResult = await c.env.DB
    .prepare("UPDATE users SET password_hash = ?, password_updated_at = ? WHERE id = ? AND password_hash IS NULL")
    .bind(passwordHash, passwordUpdatedAt, user.id)
    .run();

  if (!setPasswordResult.success || Number(setPasswordResult.meta.changes ?? 0) < 1) {
    return { passwordProvisioned: false, passwordDelivery: null };
  }

  try {
    const delivery = await sendPasswordCredentialsEmail(c.env, user.email, temporaryPassword, { isReset: false });
    console.info("password_credentials_email_sent", {
      email: maskEmailForLogs(user.email),
      requestId: delivery.id
    });
    return { passwordProvisioned: true, passwordDelivery: "email" };
  } catch (error) {
    console.error("Failed to send initial password email", error);

    if (allowDebug) {
      return {
        passwordProvisioned: true,
        passwordDelivery: "debug",
        temporaryPassword
      };
    }

    await c.env.DB
      .prepare("UPDATE users SET password_hash = NULL, password_updated_at = NULL WHERE id = ? AND password_hash = ?")
      .bind(user.id, passwordHash)
      .run();

    return {
      passwordProvisioned: false,
      passwordDelivery: null
    };
  }
}

async function resetPasswordForUser(
  c: Context<AppEnv>,
  user: UserRow
): Promise<{ delivery: "email" | "debug"; temporaryPassword?: string } | null> {
  const temporaryPassword = generateReadablePassword(14);
  const passwordHash = await hashPassword(temporaryPassword);
  const passwordUpdatedAt = nowIso();
  const allowDebug = shouldAllowDebugResponse(c);

  const existingHash = user.password_hash;
  const existingUpdatedAt = user.password_updated_at;

  await c.env.DB
    .prepare("UPDATE users SET password_hash = ?, password_updated_at = ? WHERE id = ?")
    .bind(passwordHash, passwordUpdatedAt, user.id)
    .run();

  try {
    const delivery = await sendPasswordCredentialsEmail(c.env, user.email, temporaryPassword, { isReset: true });
    console.info("password_reset_email_sent", {
      email: maskEmailForLogs(user.email),
      requestId: delivery.id
    });
    return { delivery: "email" };
  } catch (error) {
    console.error("Failed to send password reset email", error);

    await c.env.DB
      .prepare("UPDATE users SET password_hash = ?, password_updated_at = ? WHERE id = ?")
      .bind(existingHash, existingUpdatedAt, user.id)
      .run();

    if (!allowDebug) {
      return null;
    }

    await c.env.DB
      .prepare("UPDATE users SET password_hash = ?, password_updated_at = ? WHERE id = ?")
      .bind(passwordHash, passwordUpdatedAt, user.id)
      .run();

    return {
      delivery: "debug",
      temporaryPassword
    };
  }
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

  user = await ensureLifetimePro(c, user);
  const passwordResult = await provisionPasswordForUser(c, user);
  const sessionToken = await setSessionCookie(c, user);
  const includeFallbackToken = shouldIncludeSessionFallbackToken(c);

  return c.json({
    success: true,
    redirectTo: "/app/dashboard",
    ...passwordResult,
    ...(includeFallbackToken ? { sessionToken, sessionAuthMode: "bearer" } : {})
  });
}

export async function authenticateRequest(c: Context<AppEnv>): Promise<AuthUser | null> {
  const cookieHeader = c.req.header("Cookie");
  const authorizationHeader = c.req.header("Authorization");
  const bearerToken =
    authorizationHeader && authorizationHeader.startsWith("Bearer ") ? authorizationHeader.slice("Bearer ".length).trim() : null;
  const sessionToken = parseCookie(cookieHeader, SESSION_COOKIE_NAME) ?? bearerToken;
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
    const allowMagicLinkInResponse = shouldAllowDebugResponse(c);

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

  app.post("/auth/login-password", async (c) => {
    const parsedBody = authPasswordLoginSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsedBody.success) {
      return c.json({ error: "Invalid email or password format" }, 400);
    }

    const { email, password } = parsedBody.data;
    const existing = await getUserByEmail(c.env.DB, email);
    if (!existing || !existing.password_hash) {
      return c.json({ error: "Invalid login credentials" }, 401);
    }

    const validPassword = await verifyPassword(password, existing.password_hash);
    if (!validPassword) {
      return c.json({ error: "Invalid login credentials" }, 401);
    }

    const user = await ensureLifetimePro(c, existing);
    const sessionToken = await setSessionCookie(c, user);
    const includeFallbackToken = shouldIncludeSessionFallbackToken(c);
    return c.json({
      success: true,
      redirectTo: "/app/dashboard",
      ...(includeFallbackToken ? { sessionToken, sessionAuthMode: "bearer" } : {})
    });
  });

  app.post("/auth/request-password", async (c) => {
    const parsedBody = authRequestPasswordSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsedBody.success) {
      return c.json({ error: "Invalid email address" }, 400);
    }

    const { email } = parsedBody.data;
    const existing = await getUserByEmail(c.env.DB, email);
    if (!existing) {
      return c.json({
        success: true,
        message: "If an account exists for this email, password instructions have been sent."
      });
    }

    const resetResult = await resetPasswordForUser(c, existing);
    if (!resetResult) {
      return c.json({ error: "Unable to send password email right now. Please try again shortly." }, 502);
    }

    return c.json({
      success: true,
      message:
        resetResult.delivery === "debug"
          ? "Email delivery failed in this environment; use the temporary password below."
          : "Password email sent",
      delivery: resetResult.delivery,
      temporaryPassword: resetResult.temporaryPassword
    });
  });

  app.get("/auth/consume", async (c) => {
    c.header("Allow", "POST");
    return c.json({ error: "Method not allowed. Use POST /auth/consume." }, 405);
  });

  app.post("/api/logout", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    await incrementUserSessionVersion(c.env.DB, auth.id);

    const secure = shouldUseSecureCookie(c.req.url);
    const sameSite = sessionSameSite(c.req.url, c.req.header("Origin"));
    c.header("Set-Cookie", clearSessionCookie(SESSION_COOKIE_NAME, secure, sameSite));
    return c.json({ success: true });
  });
}
