import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware, requireAdmin } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { telemetryRoutes } from "./routes/telemetry";
import { deviceRoutes } from "./routes/devices";
import { alertRoutes } from "./routes/alerts";
import { handleScheduledCron } from "./services/cron";

const app = new Hono<{ Bindings: Env; Variables: { authRole: string } }>();

app.use("*", cors());
app.use("*", rateLimitMiddleware);

app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

const api = app.basePath("/api/v1");

api.use("*", authMiddleware);

api.route("/telemetry", telemetryRoutes);

api.route("/devices", deviceRoutes);
api.use("/devices/register", requireAdmin);

api.route("/alerts", alertRoutes);
api.use("/alerts/resolve", requireAdmin);

export default {
  fetch: app.fetch,
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduledCron(env));
  },
} satisfies ExportedHandler<Env>;
