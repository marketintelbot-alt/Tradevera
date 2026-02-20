# Tradevera

Tradevera is a production-ready trading journal SaaS MVP with:
- Passwordless magic-link auth
- Cloud sync on Cloudflare Worker + D1
- Stripe Pro subscriptions + webhook unlock logic
- Resend transactional email (magic-link + Pro welcome)
- Free plan limits: 50 trades and 50 days
- Pro analytics, weekly review, PDF export, no ads
- Projects + tasks workspace for execution planning (all plans)
- Trade screenshot attachments per trade
- Risk guardrails with lockout cooldowns
- Stripe Customer Portal billing management
- PWA install support + mobile quick-add action
- Premium React/Tailwind UI

## Tonight Go-Live (Fast Path)

If your goal is "ready for sales tonight", do these in order:

1. Render: sync latest `main` commit and redeploy
- Repo: `marketintelbot-alt/Tradevera`
- Env var on Render static site:
  - `VITE_API_BASE_URL=https://tradevera-worker.tradevera.workers.dev`

2. Cloudflare Worker vars/secrets (production)
- Worker: `tradevera-worker`
- Vars:
  - `FRONTEND_ORIGIN=https://tradevera-web.onrender.com`
  - `APP_URL=https://tradevera-web.onrender.com`
- Secrets:
  - `JWT_SECRET`
  - `STRIPE_SECRET_KEY` (live)
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_ID_PRO`
  - `RESEND_API_KEY`
  - `RESEND_FROM`
  - `SUPPORT_EMAIL`
- Keep `ALLOW_MAGIC_LINK_IN_RESPONSE` unset or `false` in production.
- Optional one-command deploy from terminal:
  - `bash scripts/deploy-worker-prod.sh` (after exporting required env vars listed in the script)
  - Uses `CLOUDFLARE_API_TOKEN` if provided, or your existing `wrangler login` OAuth session otherwise.

3. Resend sender must be verified
- `RESEND_FROM` must be a verified domain sender (not Gmail).
- If this is not set correctly, `/auth/request-link` returns `502` and login emails fail.

4. Stripe webhook (required for automatic Pro unlock/downgrade)
- Endpoint:
  - `https://tradevera-worker.tradevera.workers.dev/api/stripe/webhook`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

5. Google AdSense on Free plan only
- Already enforced in UI:
  - Ads render only for `user.plan === "free"`.
  - Ads render only on dashboard/trades pages.
  - Ads do not render in trade entry forms.
- Set Render env vars and redeploy:
  - `VITE_ADSENSE_CLIENT_ID=ca-pub-...`
  - `VITE_ADSENSE_SLOT_DASHBOARD=...`
  - `VITE_ADSENSE_SLOT_TRADES=...`
  - `VITE_ADSENSE_SLOT_FOOTER=...` (optional)

## Monorepo Structure

```txt
tradevera/
  apps/
    web/                 # Vite + React + Tailwind static frontend
    worker/              # Cloudflare Worker API + Stripe + D1 + Resend
  packages/
    shared/              # Shared types + Zod schemas
```

## Tech Stack

- Frontend hosting: Render Static Site (free)
- Backend hosting: Cloudflare Worker (free tier)
- Database: Cloudflare D1 (SQLite)
- Email: Resend
- Payments: Stripe Checkout + webhooks
- Monorepo: pnpm workspaces

## Feature Coverage

### Auth
- `POST /auth/request-link` creates hashed one-time token (15 min expiry), stores in D1, emails magic link
- `POST /auth/consume` validates token, creates user if new, issues JWT in HttpOnly cookie (`tv_session`)
- `/auth/callback?token=...` in the web app requires an explicit user click to finish sign-in (prevents link scanners from burning tokens)
- JWT includes `sub`, `email`, `iat`, `exp`, `session_version`
- Logout increments `session_version` and clears cookie

### Subscription + Stripe
- `POST /api/stripe/create-checkout-session` (auth required in handler) creates Stripe Checkout session for subscription
- `POST /api/stripe/create-portal-session` creates Stripe Billing Portal session for customer self-service
- `POST /api/stripe/webhook` verifies `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`
- Handles:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Updates `subscriptions` table and user plan (`free`/`pro`)
- Sends “Welcome to Tradevera Pro” on first activation

### Trade Journal
- Full CRUD on `trades`
- Free users hard-capped at 50 trades (backend-enforced)
- Free users also capped at 50 days from account creation (backend-enforced)
- Quick add modal, advanced entry page, edit/delete
- Search/filter/sort and CSV import on trade list
- Screenshot attachments per trade (upload/delete)

### Projects + Tasks
- Full CRUD on `projects` and `tasks`
- Project statuses: `active`, `paused`, `completed`, `archived`
- Task statuses: `todo`, `in_progress`, `done`
- Priority levels: `low`, `medium`, `high`, `critical`
- Task board with filters, templates, due-date handling, and progress views
- Available on Free and Pro (subject to Free 50-day window)

### Risk Guardrails
- `/api/risk-settings` lets users configure daily max loss, max consecutive losses, and cooldown duration
- Guardrail lockouts block new trade entries with `423` until cooldown expires
- Manual unlock endpoint for controlled reset

### Analytics + Review
- Core analytics for all users: win rate, total PnL, avg win/loss, setup stats, streaks
- Pro-only analytics: profit factor, expectancy, drawdown, equity curve, rolling win rate, session/setup breakdown
- Monthly PnL calendar tab with month/week/day toggle, session markers, and CSV export
- Weekly review page for Pro with PDF export via `html2canvas` + `jsPDF`

### Utilities
- Position size calculator
- R-multiple calculator
- Pre-market / post-market checklist templates

### Ads
- Free-only subtle ad slot component on dashboard/trades pages
- No ads on trade entry forms
- Supports Google AdSense via frontend env vars
- Policy note: forcing users to watch/click Google ads can violate AdSense terms

## Database Schema & Migrations

Migrations are in:
- `apps/worker/migrations/0001_init.sql`
- `apps/worker/migrations/0002_projects_tasks.sql`
- `apps/worker/migrations/0003_risk_and_screenshots.sql`

Tables:
- `users`
- `login_tokens`
- `subscriptions`
- `trades`
- `projects`
- `tasks`
- `risk_settings`
- `trade_screenshots`

Indexes included:
- `trades_user_id_opened_at`
- `trades_user_id_symbol`
- `projects_user_id_updated_at`
- `tasks_user_id_status_due_at`
- `tasks_user_id_project_id`
- `trade_screenshots_trade_id_created_at`
- `risk_settings_user_id`
- plus token/subscription helper indexes

## Environment Variables

### Frontend (`apps/web`)

```env
VITE_API_BASE_URL=https://<your-worker-domain>
VITE_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxxxxx
VITE_ADSENSE_SLOT_DASHBOARD=<slot-id>
VITE_ADSENSE_SLOT_TRADES=<slot-id>
VITE_ADSENSE_SLOT_FOOTER=<optional-slot-id>
```

Note: the code includes a default Tradevera AdSense publisher ID fallback. Setting `VITE_ADSENSE_CLIENT_ID` explicitly in Render env is still recommended.

### Worker (`apps/worker`)

```env
FRONTEND_ORIGIN=https://<your-render-domain>
JWT_SECRET=<random long secret>
STRIPE_SECRET_KEY=<stripe sk_...>
STRIPE_WEBHOOK_SECRET=<whsec_...>
STRIPE_PRICE_ID_PRO=<price_...>
RESEND_API_KEY=<re_...>
RESEND_FROM=Tradevera <no-reply@yourdomain.com>
APP_URL=https://<your-render-domain>
SUPPORT_EMAIL=support@yourdomain.com
```

Use:
- `apps/web/.env.example`
- `apps/worker/.dev.vars.example`

## Local Development

Prerequisites:
- Node.js 20+
- pnpm 9+
- Cloudflare account + Wrangler authenticated

From repo root:

```bash
pnpm install
```

### 1) Configure Worker secrets (local)

Create `apps/worker/.dev.vars` from `.dev.vars.example` and fill values.

For local testing, keep:

```env
ALLOW_MAGIC_LINK_IN_RESPONSE=true
```

If Resend fails, login will still work by returning a one-time debug magic link in the login response UI.

### 2) D1 local migrations

```bash
pnpm -C apps/worker migrate:local
```

### 3) Optional seed data

```bash
pnpm -C apps/worker seed:local
```

### 4) Run backend (Worker)

```bash
pnpm -C apps/worker dev
```

### 5) Run frontend

In `apps/web/.env`, set:

```env
VITE_API_BASE_URL=http://127.0.0.1:8787
```

Then:

```bash
pnpm -C apps/web dev
```

## Deployment

## 1) Cloudflare (Worker + D1)

1. Create D1 database:

```bash
wrangler d1 create tradevera
```

2. Copy `database_id` into `apps/worker/wrangler.toml` under `[[d1_databases]]`.

3. Set Worker secrets:

```bash
cd apps/worker
wrangler secret put JWT_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STRIPE_PRICE_ID_PRO
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_FROM
wrangler secret put SUPPORT_EMAIL
```

4. Set non-secret vars in `wrangler.toml` (`FRONTEND_ORIGIN`, `APP_URL`).

5. Apply migrations remotely:

```bash
pnpm -C apps/worker migrate:remote
```

6. Deploy Worker:

```bash
pnpm -C apps/worker deploy
```

## 2) Stripe

1. In Stripe Dashboard, create webhook endpoint:

```txt
https://<your-worker-domain>/api/stripe/webhook
```

2. Subscribe to events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

3. Copy webhook signing secret (`whsec_...`) to `STRIPE_WEBHOOK_SECRET`.

4. Ensure `STRIPE_PRICE_ID_PRO` points to your existing Pro price.

## 3) Resend

1. Create API key in Resend.
2. Verify domain and from-address.
3. Set `RESEND_API_KEY` + `RESEND_FROM` in Worker secrets.

## 4) Render (Static Frontend)

1. Create a new **Static Site** from this repo.
2. Build command:

```bash
pnpm -C apps/web build
```

3. Publish directory:

```txt
apps/web/dist
```

4. Add env var:

```env
VITE_API_BASE_URL=https://<your-worker-domain>
# Optional AdSense on Free plan pages:
VITE_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxxxxx
VITE_ADSENSE_SLOT_DASHBOARD=<slot-id>
VITE_ADSENSE_SLOT_TRADES=<slot-id>
```

5. Add SPA rewrite rule so all routes serve `index.html`.

## Security Notes

- Stripe webhook signatures are verified before processing.
- Session cookie is `HttpOnly` + `SameSite=Lax` + `Secure` on HTTPS.
- JWT revocation supported via `users.session_version`.
- API auth middleware protects `/api/*` with explicit public exceptions:
  - `/api/stripe/webhook`
  - `/api/stripe/create-checkout-session` (handler still enforces auth)

## Route List

- `POST /auth/request-link`
- `POST /auth/consume`
- `GET /auth/consume` (returns `405` guidance; consume is POST-only)
- `POST /api/logout`
- `GET /api/me`
- `GET /api/trades`
- `POST /api/trades`
- `PUT /api/trades/:id`
- `DELETE /api/trades/:id`
- `GET /api/trades/:id/screenshots`
- `POST /api/trades/:id/screenshots`
- `DELETE /api/trades/:id/screenshots/:screenshotId`
- `GET /api/projects`
- `POST /api/projects`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `GET /api/risk-settings`
- `PUT /api/risk-settings`
- `POST /api/risk-settings/unlock`
- `POST /api/stripe/create-checkout-session`
- `POST /api/stripe/create-portal-session`
- `POST /api/stripe/webhook`
- `GET /health`

## Acceptance Test Checklist

1. Magic link login persists via HttpOnly cookie.
2. Free user can create 50 trades; 51st returns `402` with upgrade message.
3. Free user beyond 50 days from signup receives `402` for restricted API usage until upgrade.
4. Pro user can create unlimited trades.
5. Stripe webhook upgrades/downgrades user plan.
6. First Pro activation sends welcome email and writes subscription row.
7. `/api/me` returns plan + trade usage + Free day window accurately.
8. UI reflects plan and gates Pro features.
9. Deployable on Render + Cloudflare with the steps above.

## Notes

- For cross-origin cookie auth in production, prefer using frontend + API on the same site (e.g., `app.yourdomain.com` and `api.yourdomain.com`) so `SameSite=Lax` works consistently.
- In production, set `ALLOW_MAGIC_LINK_IN_RESPONSE` to `false` or unset it.
