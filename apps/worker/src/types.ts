export interface Env {
  DB: D1Database;
  FRONTEND_ORIGIN: string;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_ID_PRO?: string;
  STRIPE_PRICE_ID_STARTER?: string;
  STRIPE_PRICE_PRO?: string;
  STRIPE_PRICE_STARTER?: string;
  RESEND_API_KEY: string;
  RESEND_FROM: string;
  APP_URL: string;
  SUPPORT_EMAIL?: string;
  ALLOW_MAGIC_LINK_IN_RESPONSE?: string;
  LIFETIME_PRO_EMAILS?: string;
  FORCE_SESSION_FALLBACK_AUTH?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  plan: "free" | "starter" | "pro";
  createdAt: string;
  sessionVersion: number;
}

export interface SessionJwtPayload {
  sub: string;
  email: string;
  plan?: "free" | "starter" | "pro";
  session_version: number;
  iat: number;
  exp: number;
}

export interface AppEnv {
  Bindings: Env;
  Variables: {
    authUser?: AuthUser;
  };
}
