import { timingSafeEqual } from "./security";

export interface StripeCheckoutSessionResult {
  id: string;
  url: string;
}

export interface StripePortalSessionResult {
  id: string;
  url: string;
}

interface CreateCheckoutOptions {
  stripeSecretKey: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
  email: string;
}

interface CreatePortalOptions {
  stripeSecretKey: string;
  customerId: string;
  returnUrl: string;
}

export async function createStripeCheckoutSession(options: CreateCheckoutOptions): Promise<StripeCheckoutSessionResult> {
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("success_url", options.successUrl);
  form.set("cancel_url", options.cancelUrl);
  form.set("customer_email", options.email);
  form.set("line_items[0][price]", options.priceId);
  form.set("line_items[0][quantity]", "1");
  form.set("allow_promotion_codes", "true");
  form.set("metadata[user_id]", options.userId);
  form.set("metadata[email]", options.email);
  form.set("metadata[price_id]", options.priceId);
  form.set("subscription_data[metadata][user_id]", options.userId);
  form.set("subscription_data[metadata][email]", options.email);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  });

  const payload = (await response.json()) as { id?: string; url?: string; error?: { message?: string } };

  if (!response.ok || !payload.id || !payload.url) {
    const message = payload.error?.message ?? "Unable to create checkout session";
    throw new Error(message);
  }

  return {
    id: payload.id,
    url: payload.url
  };
}

export async function createStripePortalSession(options: CreatePortalOptions): Promise<StripePortalSessionResult> {
  const form = new URLSearchParams();
  form.set("customer", options.customerId);
  form.set("return_url", options.returnUrl);

  const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  });

  const payload = (await response.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !payload.id || !payload.url) {
    const message = payload.error?.message ?? "Unable to create billing portal session";
    throw new Error(message);
  }

  return {
    id: payload.id,
    url: payload.url
  };
}

function hexEncode(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return hexEncode(digest);
}

export async function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSeconds = 300
): Promise<boolean> {
  if (!signatureHeader || !webhookSecret) {
    return false;
  }

  const segments = signatureHeader.split(",").map((item) => item.trim());
  const timestampPart = segments.find((entry) => entry.startsWith("t="));
  const signatures = segments
    .filter((entry) => entry.startsWith("v1="))
    .map((entry) => entry.replace("v1=", ""));

  if (!timestampPart || signatures.length === 0) {
    return false;
  }

  const timestamp = Number(timestampPart.replace("t=", ""));
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = await hmacSha256Hex(webhookSecret, signedPayload);
  return signatures.some((signature) => timingSafeEqual(signature, expected));
}
