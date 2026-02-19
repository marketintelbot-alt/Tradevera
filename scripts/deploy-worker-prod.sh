#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_DIR="${ROOT_DIR}/apps/worker"

required_env=(
  JWT_SECRET
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  STRIPE_PRICE_ID_PRO
  RESEND_API_KEY
  RESEND_FROM
  SUPPORT_EMAIL
  FRONTEND_ORIGIN
  APP_URL
)

for key in "${required_env[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required env var: ${key}" >&2
    exit 1
  fi
done

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN not set. Using Wrangler OAuth session..."
  npx wrangler whoami >/dev/null
fi

put_secret() {
  local key="$1"
  local value="$2"
  printf "%s" "${value}" | npx wrangler secret put "${key}" >/dev/null
  echo "Set secret ${key}"
}

cd "${WORKER_DIR}"

echo "Applying D1 migrations (remote)..."
npx wrangler d1 migrations apply DB --remote

echo "Updating worker secrets..."
put_secret "JWT_SECRET" "${JWT_SECRET}"
put_secret "STRIPE_SECRET_KEY" "${STRIPE_SECRET_KEY}"
put_secret "STRIPE_WEBHOOK_SECRET" "${STRIPE_WEBHOOK_SECRET}"
put_secret "STRIPE_PRICE_ID_PRO" "${STRIPE_PRICE_ID_PRO}"
put_secret "RESEND_API_KEY" "${RESEND_API_KEY}"
put_secret "RESEND_FROM" "${RESEND_FROM}"
put_secret "SUPPORT_EMAIL" "${SUPPORT_EMAIL}"

echo "Deploying worker..."
npx wrangler deploy --var "FRONTEND_ORIGIN:${FRONTEND_ORIGIN}" --var "APP_URL:${APP_URL}"

echo
echo "Worker deploy complete."
echo "Smoke test:"
echo "  curl -sS https://tradevera-worker.tradevera.workers.dev/health"
