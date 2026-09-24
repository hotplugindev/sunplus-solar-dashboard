import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware, requireAdmin } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { sourceRoutes } from "./routes/sources";
import { metricsRoutes } from "./routes/metrics";
import { handleScheduledCron } from "./services/cron";

const app = new Hono<{ Bindings: Env; Variables: { authRole: string } }>();

app.use("*", cors());
app.use("*", rateLimitMiddleware);

app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

const api = app.basePath("/api/v1");

api.use("*", authMiddleware);

api.route("/sources", sourceRoutes);
api.use("/sources/*", requireAdmin);

api.route("/metrics", metricsRoutes);

export default {
  fetch: app.fetch,
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduledCron(env));
  },
} satisfies ExportedHandler<Env>;
