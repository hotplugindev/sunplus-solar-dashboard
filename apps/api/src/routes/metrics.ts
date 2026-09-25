import { Hono } from "hono";
import { telemetryRangeSchema } from "@sunplus/shared";
import type { NormalizedMetric, TelemetrySample } from "@sunplus/shared";
import { getAdapter } from "../services/providers";
import { getActiveSourcesWithAuth, markSourcePolled } from "../services/sources";

const METRICS_KV_TTL = 3600;

export const metricsRoutes = new Hono<{ Bindings: Env; Variables: { authRole: string } }>();

metricsRoutes.get("/", async (c) => {
  const sources = await getActiveSourcesWithAuth(c.env.DB);
  const allMetrics: NormalizedMetric[] = [];

  for (const { source, auth } of sources) {
    const adapter = getAdapter(source.provider as NormalizedMetric["provider"], c.env.DB);
    if (!adapter || !auth) continue;

    try {
      const metrics = await adapter.poll(auth);

      for (const m of metrics) {
        m.sourceId = source.id;
        m.sourceName = source.name;
      }

      allMetrics.push(...metrics);
      await markSourcePolled(c.env.DB, source.id, null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markSourcePolled(c.env.DB, source.id, msg);
    }
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

metricsRoutes.get("/cached", async (c) => {
  const raw = await c.env.TELEMETRY_KV.get("metrics:latest");
  if (!raw) {
    return c.json({ metrics: [], timestamp: null });
  }

  return c.json(
    { metrics: JSON.parse(raw), timestamp: new Date().toISOString() },
    200,
    { "Cache-Control": "public, max-age=300, s-maxage=300" }
  );
});

metricsRoutes.get("/:sourceId/history", async (c) => {
  const sourceId = parseInt(c.req.param("sourceId"), 10);
  if (isNaN(sourceId)) return c.json({ error: "Invalid source ID" }, 400);

  const rangeParam = c.req.query("range") ?? "24h";
  const rangeParsed = telemetryRangeSchema.safeParse(rangeParam);
  if (!rangeParsed.success) {
    return c.json({ error: "Invalid range. Use one of: 1h, 6h, 24h, 7d, 30d" }, 400);
  }

  if (rangeParsed.data === "30d") {
    const chartData = await c.env.TELEMETRY_KV.get(`chart:${sourceId}:90d`);
    if (chartData) {
      return c.json(
        { sourceId, range: rangeParsed.data, data: JSON.parse(chartData) },
        200,
        { "Cache-Control": "public, max-age=3600, s-maxage=3600" }
      );
    }
  }

  const rangeMs: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };

  const ms = rangeMs[rangeParsed.data] ?? rangeMs["24h"]!;
  const since = new Date(Date.now() - ms).toISOString();

  const { results } = await c.env.DB
    .prepare(
      `SELECT ac_power_kw, daily_yield_kwh, battery_soc, grid_power_kw, timestamp
       FROM telemetry_logs
       WHERE source_id = ? AND timestamp >= ?
       ORDER BY timestamp ASC`
    )
    .bind(sourceId, since)
    .all<TelemetrySample & { battery_soc: number | null; grid_power_kw: number | null }>();

  return c.json(
    { sourceId, range: rangeParsed.data, telemetry: results },
    200,
    { "Cache-Control": "public, max-age=300, s-maxage=300" }
  );
});
