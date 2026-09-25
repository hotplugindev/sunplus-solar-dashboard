import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware, requireAdmin } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { sourceRoutes } from "./routes/sources";
import { metricsRoutes } from "./routes/metrics";
import { setupRoutes } from "./routes/setup";
import { publicMetricsRoutes } from "./routes/public";
import { handleScheduledCron } from "./services/cron";

const app = new Hono<{ Bindings: Env; Variables: { authRole: string } }>();

app.use("*", cors());
app.use("*", rateLimitMiddleware);

app.get("/health", async (c) => {
  let dbOk = false;
  let kvOk = false;

  try {
    await c.env.DB.prepare("SELECT 1").first();
    dbOk = true;
  } catch {}

  try {
    await c.env.TELEMETRY_KV.get("health_check");
    kvOk = true;
  } catch {}

  let sourcesTotal = 0;
  let sourcesActive = 0;
  let sourcesHealthy = 0;

  if (dbOk) {
    try {
      const total = await c.env.DB.prepare("SELECT COUNT(*) as count FROM sources").first<{ count: number }>();
      sourcesTotal = total?.count ?? 0;
      const active = await c.env.DB.prepare("SELECT COUNT(*) as count FROM sources WHERE is_active = 1").first<{ count: number }>();
      sourcesActive = active?.count ?? 0;
      const healthy = await c.env.DB.prepare("SELECT COUNT(*) as count FROM sources WHERE is_active = 1 AND consecutive_failures = 0").first<{ count: number }>();
      sourcesHealthy = healthy?.count ?? 0;
    } catch {}
  }

  const status = dbOk && kvOk ? "ok" : (!dbOk && !kvOk ? "down" : "degraded");
  const httpStatus = status === "down" ? 503 : 200;

  return c.json({
    status,
    db: dbOk,
    kv: kvOk,
    sourcesTotal,
    sourcesActive,
    sourcesHealthy,
    timestamp: new Date().toISOString(),
  }, httpStatus);
});

const api = app.basePath("/api/v1");

api.route("/setup", setupRoutes);

api.use("*", authMiddleware);

api.use("/sources/*", requireAdmin);
api.route("/sources", sourceRoutes);

api.route("/metrics", metricsRoutes);

api.route("/public", publicMetricsRoutes);

export default {
  fetch: app.fetch,
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduledCron(env));
  },
} satisfies ExportedHandler<Env>;
