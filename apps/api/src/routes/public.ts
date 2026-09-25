import { Hono } from "hono";
import { getAdapter } from "../services/providers";
import { getActiveSourcesWithAuth } from "../services/sources";

const METRICS_KV_TTL = 3600;

export const publicMetricsRoutes = new Hono<{ Bindings: Env; Variables: { authRole: string } }>();

publicMetricsRoutes.get("/metrics", async (c) => {
  const raw = await c.env.TELEMETRY_KV.get("metrics:latest");
  if (raw) {
    return c.json(
      { metrics: JSON.parse(raw), timestamp: new Date().toISOString() },
      200,
      { "Cache-Control": "public, max-age=60, s-maxage=60" }
    );
  }

  const sources = await getActiveSourcesWithAuth(c.env.DB);
  const allMetrics: Array<any> = [];

  for (const { source, auth } of sources) {
    const adapter = getAdapter(source.provider as any, c.env.DB);
    if (!adapter || !auth) continue;

    try {
      const metrics = await adapter.poll(auth);
      for (const m of metrics) {
        m.sourceId = source.id;
        m.sourceName = source.name;
      }
      allMetrics.push(...metrics);
    } catch {}
  }

  await c.env.TELEMETRY_KV.put(
    "metrics:latest",
    JSON.stringify(allMetrics),
    { expirationTtl: METRICS_KV_TTL }
  );

  return c.json(
    { metrics: allMetrics, timestamp: new Date().toISOString() },
    200,
    { "Cache-Control": "public, max-age=60, s-maxage=60" }
  );
});
