import type { AuthUser } from "../types";

export const FREE_TRADE_LIMIT = 50;
export const FREE_PLAN_MAX_DAYS = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

export function freeExpiryDate(createdAt: string): Date {
  const startMs = new Date(createdAt).getTime();
  const safeStart = Number.isNaN(startMs) ? Date.now() : startMs;
  return new Date(safeStart + FREE_PLAN_MAX_DAYS * DAY_MS);
}

export function freeDaysRemaining(createdAt: string, now = Date.now()): number {
  const expiryMs = freeExpiryDate(createdAt).getTime();
  if (now >= expiryMs) {
    return 0;
  }
  return Math.ceil((expiryMs - now) / DAY_MS);
}

export function isFreeExpired(user: Pick<AuthUser, "plan" | "createdAt">, now = Date.now()): boolean {
  if (user.plan !== "free") {
    return false;
  }
  return freeDaysRemaining(user.createdAt, now) <= 0;
}
