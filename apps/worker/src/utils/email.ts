import type { Env } from "../types";

interface ResendPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}

interface ResendSendResponse {
  id: string;
}

async function sendResendEmail(env: Env, payload: ResendPayload): Promise<ResendSendResponse> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
    throw new Error("Resend env is missing RESEND_API_KEY or RESEND_FROM");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend request failed: ${response.status} ${errorBody}`);
  }

  const parsed = (await response.json().catch(() => null)) as Partial<ResendSendResponse> | null;
  if (!parsed?.id || typeof parsed.id !== "string") {
    throw new Error("Resend request succeeded but no message id was returned");
  }

  return { id: parsed.id };
}

export async function sendMagicLinkEmail(env: Env, to: string, magicLink: string): Promise<ResendSendResponse> {
  const subject = "Your Tradevera login link";
  const text = `Open this secure link to sign in: ${magicLink}\n\nThis link expires in 15 minutes.`;
  const html = `
    <div style="font-family:Arial, sans-serif; max-width:560px; margin:0 auto; padding:24px; color:#111827;">
      <h2 style="margin:0 0 12px;">Sign in to Tradevera</h2>
      <p style="margin:0 0 16px; color:#374151;">Use this secure magic link to access your trading journal.</p>
      <a href="${magicLink}" style="display:inline-block; padding:12px 18px; background:#0f172a; color:#ffffff; border-radius:8px; text-decoration:none; font-weight:600;">Sign in</a>
      <p style="margin:16px 0 0; font-size:12px; color:#6b7280;">This link expires in 15 minutes. If you did not request it, you can ignore this email.</p>
    </div>
  `;

  return sendResendEmail(env, {
    from: env.RESEND_FROM,
    to: [to],
    subject,
    html,
    text
  });
}

export async function sendPasswordCredentialsEmail(
  env: Env,
  to: string,
  password: string,
  options?: { isReset?: boolean }
): Promise<ResendSendResponse> {
  const supportEmail = env.SUPPORT_EMAIL ?? "support@tradevera.app";
  const isReset = options?.isReset ?? false;
  const subject = isReset ? "Your Tradevera password was reset" : "Your Tradevera password is ready";
  const text = [
    "Tradevera account login details",
    "",
    `Username: ${to}`,
    `Password: ${password}`,
    "",
    `Login page: ${env.APP_URL}/login`,
    "",
    isReset
      ? "If you requested this reset, you can sign in with the password above."
      : "This password was generated after your first secure magic-link login.",
    `Need help? ${supportEmail}`
  ].join("\n");
  const html = `
    <div style="font-family:Arial, sans-serif; max-width:560px; margin:0 auto; padding:24px; color:#111827;">
      <h2 style="margin:0 0 12px;">${isReset ? "Password reset complete" : "Your Tradevera password is ready"}</h2>
      <p style="margin:0 0 12px; color:#374151;">
        ${
          isReset
            ? "Use the credentials below to sign back in."
            : "Use these credentials for fast login without requesting a magic link each time."
        }
      </p>
      <div style="margin:0 0 14px; padding:14px; border:1px solid #e5e7eb; border-radius:10px; background:#f9fafb;">
        <p style="margin:0 0 6px; font-size:13px; color:#6b7280;">Username</p>
        <p style="margin:0 0 10px; font-weight:700;">${to}</p>
        <p style="margin:0 0 6px; font-size:13px; color:#6b7280;">Password</p>
        <p style="margin:0; font-weight:700;">${password}</p>
      </div>
      <a href="${env.APP_URL}/login" style="display:inline-block; padding:12px 18px; background:#0f172a; color:#ffffff; border-radius:8px; text-decoration:none; font-weight:600;">
        Open Tradevera login
      </a>
      <p style="margin:16px 0 0; font-size:12px; color:#6b7280;">
        Keep this email private. For support, contact ${supportEmail}.
      </p>
    </div>
  `;

  return sendResendEmail(env, {
    from: env.RESEND_FROM,
    to: [to],
    subject,
    html,
    text
  });
}

export async function sendProWelcomeEmail(env: Env, to: string): Promise<ResendSendResponse> {
  const supportEmail = env.SUPPORT_EMAIL ?? "support@tradevera.app";
  const subject = "Welcome to Tradevera Pro";
  const text = `Welcome to Tradevera Pro.\n\nStart here: ${env.APP_URL}/app/dashboard\nWeekly review: ${env.APP_URL}/app/review\nTools: ${env.APP_URL}/app/tools\n\nNeed help? ${supportEmail}`;
  const html = `
    <div style="font-family:Arial, sans-serif; max-width:560px; margin:0 auto; padding:24px; color:#111827;">
      <h2 style="margin:0 0 12px;">Welcome to Tradevera Pro</h2>
      <p style="margin:0 0 12px; color:#374151;">Your Pro plan is active. Here is the fastest way to get value:</p>
      <ul style="padding-left:18px; color:#374151; margin:0 0 16px;">
        <li>Open your dashboard and review the equity curve.</li>
        <li>Run a weekly review and export your summary PDF.</li>
        <li>Use setup/session analytics to tighten your edge.</li>
      </ul>
      <a href="${env.APP_URL}/app/dashboard" style="display:inline-block; padding:12px 18px; background:#0f172a; color:#ffffff; border-radius:8px; text-decoration:none; font-weight:600;">Open Tradevera</a>
      <p style="margin:16px 0 0; font-size:13px; color:#6b7280;">Need anything? Reply to this email or contact ${supportEmail}.</p>
    </div>
  `;

  return sendResendEmail(env, {
    from: env.RESEND_FROM,
    to: [to],
    subject,
    html,
    text
  });
}
