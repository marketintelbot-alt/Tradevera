import type { Env } from "../types";

interface ResendPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}

async function sendResendEmail(env: Env, payload: ResendPayload): Promise<void> {
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
}

export async function sendMagicLinkEmail(env: Env, to: string, magicLink: string): Promise<void> {
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

  await sendResendEmail(env, {
    from: env.RESEND_FROM,
    to: [to],
    subject,
    html,
    text
  });
}

export async function sendProWelcomeEmail(env: Env, to: string): Promise<void> {
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

  await sendResendEmail(env, {
    from: env.RESEND_FROM,
    to: [to],
    subject,
    html,
    text
  });
}
