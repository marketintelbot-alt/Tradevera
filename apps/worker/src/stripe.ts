import { checkoutSchema } from "@tradevera/shared";
import type { Hono } from "hono";
import type { AppEnv } from "./types";
import { requireAuth } from "./auth";
import { getUserByEmail, getUserById, findUserIdBySubscriptionCustomer, getLatestSubscriptionByUser } from "./utils/db";
import { sendProWelcomeEmail } from "./utils/email";
import { createStripeCheckoutSession, createStripePortalSession, verifyStripeWebhookSignature } from "./utils/stripe";
import { nowIso } from "./utils/security";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

function resolveProPriceId(env: AppEnv["Bindings"]): string | null {
  return env.STRIPE_PRICE_ID_PRO ?? env.STRIPE_PRICE_PRO ?? null;
}

async function findUserIdForEvent(
  c: import("hono").Context<AppEnv>,
  options: { hintUserId?: string | null; hintEmail?: string | null; customerId?: string | null }
): Promise<string | null> {
  if (options.hintUserId) {
    const user = await getUserById(c.env.DB, options.hintUserId);
    if (user) {
      return user.id;
    }
  }

  if (options.hintEmail) {
    const user = await getUserByEmail(c.env.DB, options.hintEmail.toLowerCase());
    if (user) {
      return user.id;
    }
  }

  if (options.customerId) {
    return findUserIdBySubscriptionCustomer(c.env.DB, options.customerId);
  }

  return null;
}

async function setUserPlan(c: import("hono").Context<AppEnv>, userId: string, targetPlan: "free" | "pro"): Promise<void> {
  const user = await getUserById(c.env.DB, userId);
  if (!user) {
    return;
  }

  const now = nowIso();
  const shouldSendWelcome = targetPlan === "pro" && user.plan !== "pro" && !user.pro_welcome_sent_at;

  await c.env.DB
    .prepare(
      "UPDATE users SET plan = ?, pro_welcome_sent_at = CASE WHEN ? = 1 THEN COALESCE(pro_welcome_sent_at, ?) ELSE pro_welcome_sent_at END WHERE id = ?"
    )
    .bind(targetPlan, shouldSendWelcome ? 1 : 0, now, userId)
    .run();

  if (shouldSendWelcome) {
    try {
      await sendProWelcomeEmail(c.env, user.email);
    } catch (error) {
      console.error("Failed to send welcome email", error);
    }
  }
}

async function upsertSubscription(
  c: import("hono").Context<AppEnv>,
  payload: {
    subscriptionId: string;
    userId: string;
    customerId: string;
    status: string;
    priceId: string;
    currentPeriodEnd: string | null;
  }
): Promise<void> {
  const timestamp = nowIso();

  await c.env.DB
    .prepare(
      [
        "INSERT INTO subscriptions (id, user_id, customer_id, status, price_id, current_period_end, created_at, updated_at)",
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        "ON CONFLICT(id) DO UPDATE SET",
        "user_id = excluded.user_id,",
        "customer_id = excluded.customer_id,",
        "status = excluded.status,",
        "price_id = excluded.price_id,",
        "current_period_end = excluded.current_period_end,",
        "updated_at = excluded.updated_at"
      ].join(" ")
    )
    .bind(
      payload.subscriptionId,
      payload.userId,
      payload.customerId,
      payload.status,
      payload.priceId,
      payload.currentPeriodEnd,
      timestamp,
      timestamp
    )
    .run();
}

async function handleCheckoutCompleted(c: import("hono").Context<AppEnv>, event: StripeEvent): Promise<void> {
  const session = event.data.object as {
    metadata?: Record<string, string>;
    customer?: string;
    customer_email?: string;
    customer_details?: { email?: string };
    subscription?: string;
  };

  const userId = await findUserIdForEvent(c, {
    hintUserId: session.metadata?.user_id,
    hintEmail: session.metadata?.email ?? session.customer_email ?? session.customer_details?.email,
    customerId: session.customer
  });

  if (!userId) {
    return;
  }

  const subscriptionId = session.subscription;
  const customerId = session.customer;
  const priceId = session.metadata?.price_id ?? resolveProPriceId(c.env);

  if (subscriptionId && customerId) {
    await upsertSubscription(c, {
      subscriptionId,
      userId,
      customerId,
      status: "active",
      priceId: priceId ?? "unknown",
      currentPeriodEnd: null
    });
  }

  await setUserPlan(c, userId, "pro");
}

async function handleSubscriptionUpdated(
  c: import("hono").Context<AppEnv>,
  event: StripeEvent,
  forceFree = false
): Promise<void> {
  const subscription = event.data.object as {
    id: string;
    customer: string;
    status: string;
    current_period_end?: number;
    metadata?: Record<string, string>;
    items?: {
      data?: Array<{
        price?: {
          id?: string;
        };
      }>;
    };
  };

  const userId = await findUserIdForEvent(c, {
    hintUserId: subscription.metadata?.user_id,
    hintEmail: subscription.metadata?.email,
    customerId: subscription.customer
  });

  if (!userId) {
    return;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id ?? resolveProPriceId(c.env) ?? "unknown";
  const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;

  await upsertSubscription(c, {
    subscriptionId: subscription.id,
    userId,
    customerId: subscription.customer,
    status: subscription.status,
    priceId,
    currentPeriodEnd
  });

  const shouldBePro = !forceFree && ACTIVE_STATUSES.has(subscription.status);
  await setUserPlan(c, userId, shouldBePro ? "pro" : "free");
}

export function registerStripeRoutes(app: Hono<AppEnv>) {
  app.post("/api/stripe/create-checkout-session", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const payload = await c.req.json().catch(() => ({}));
    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ error: "Invalid checkout request" }, 400);
    }

    const defaultProPriceId = resolveProPriceId(c.env);
    const priceId = parsed.data.priceId ?? defaultProPriceId;
    if (!priceId) {
      return c.json({ error: "Missing Stripe Pro price id configuration" }, 500);
    }
    const appUrl = c.env.APP_URL.endsWith("/") ? c.env.APP_URL.slice(0, -1) : c.env.APP_URL;

    try {
      const session = await createStripeCheckoutSession({
        stripeSecretKey: c.env.STRIPE_SECRET_KEY,
        priceId,
        successUrl: `${appUrl}/app/settings?success=1`,
        cancelUrl: `${appUrl}/app/settings?canceled=1`,
        userId: auth.id,
        email: auth.email
      });

      return c.json({ checkoutUrl: session.url, id: session.id });
    } catch (error) {
      console.error("Failed to create Stripe checkout session", error);
      return c.json({ error: "Unable to start checkout session" }, 502);
    }
  });

  app.post("/api/stripe/create-portal-session", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const latestSubscription = await getLatestSubscriptionByUser(c.env.DB, auth.id);
    const customerId = latestSubscription?.customer_id;
    if (!customerId) {
      return c.json({ error: "No Stripe billing profile found for this account." }, 404);
    }

    const appUrl = c.env.APP_URL.endsWith("/") ? c.env.APP_URL.slice(0, -1) : c.env.APP_URL;

    try {
      const portal = await createStripePortalSession({
        stripeSecretKey: c.env.STRIPE_SECRET_KEY,
        customerId,
        returnUrl: `${appUrl}/app/settings`
      });
      return c.json({ portalUrl: portal.url, id: portal.id });
    } catch (error) {
      console.error("Failed to create Stripe portal session", error);
      return c.json({ error: "Unable to open billing portal" }, 502);
    }
  });

  app.post("/api/stripe/webhook", async (c) => {
    const signature = c.req.header("Stripe-Signature") ?? "";
    const body = await c.req.text();

    const verified = await verifyStripeWebhookSignature(body, signature, c.env.STRIPE_WEBHOOK_SECRET);
    if (!verified) {
      return c.json({ error: "Invalid Stripe webhook signature" }, 400);
    }

    let event: StripeEvent;
    try {
      event = JSON.parse(body) as StripeEvent;
    } catch {
      return c.json({ error: "Invalid Stripe webhook payload" }, 400);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          await handleCheckoutCompleted(c, event);
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          await handleSubscriptionUpdated(c, event);
          break;
        }
        case "customer.subscription.deleted": {
          await handleSubscriptionUpdated(c, event, true);
          break;
        }
        default: {
          break;
        }
      }
    } catch (error) {
      console.error("Stripe webhook processing error", error);
      return c.json({ error: "Webhook processing failed" }, 500);
    }

    return c.json({ received: true });
  });
}
