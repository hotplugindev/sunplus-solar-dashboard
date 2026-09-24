import { Hono } from "hono";
import { alertResolveSchema } from "@sunplus/shared";
import { listAlerts, resolveAlert } from "../services/alerts";

export const alertRoutes = new Hono<{ Bindings: Env; Variables: { authRole: string } }>();

alertRoutes.get("/", async (c) => {
  const deviceId = c.req.query("deviceId");
  const unresolvedOnly = c.req.query("unresolved") === "true";
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!, 10) : undefined;

  const alerts = await listAlerts(c.env.DB, { deviceId, unresolvedOnly, limit });
  return c.json({ alerts });
});

alertRoutes.post("/resolve", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = alertResolveSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", issues: parsed.error.issues }, 400);
  }

  const resolved = await resolveAlert(c.env.DB, parsed.data.alertId);
  if (!resolved) {
    return c.json({ error: "Alert not found or already resolved" }, 404);
  }

  return c.json({ success: true });
});
