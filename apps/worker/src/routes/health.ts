import type { Hono } from "hono";
import type { AppEnv } from "../types";

export function registerHealthRoute(app: Hono<AppEnv>) {
  app.get("/health", (c) => c.json({ status: "ok", service: "tradevera-worker" }));
}
