import type { NormalizedMetric } from "@sunplus/shared";
import { getAdapter } from "./providers";
import { getActiveSources, markSourcePolled } from "./sources";

const METRICS_KV_TTL = 3600;
const CHART_KV_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function handleScheduledCron(env: Env): Promise<void> {
  await pollProviders(env);
  await rollupAndPrune(env);
  await preAggregateCharts(env);
}

async function pollProviders(env: Env): Promise<void> {
  const sources = await getActiveSources(env.DB);
  const allMetrics: NormalizedMetric[] = [];
  const now = Date.now();

  for (const source of sources) {
    if (source.last_polled_at) {
      const lastMs = new Date(source.last_polled_at).getTime();
      const intervalMs = source.poll_interval_minutes * 60 * 1000;
      if (now - lastMs < intervalMs) continue;
    }

    const adapter = getAdapter(source.provider as NormalizedMetric["provider"]);
    if (!adapter) continue;

    try {
      const config = JSON.parse(source.config) as Record<string, string>;
      const metrics = await adapter.poll(config);

      for (const m of metrics) {
        m.sourceId = source.id;
        m.sourceName = source.name;
      }

      allMetrics.push(...metrics);
      await markSourcePolled(env.DB, source.id, null);

      if (metrics.length > 0) {
        const stmts = metrics.map((m) =>
          env.DB.prepare(
            `INSERT INTO telemetry_logs (source_id, ac_power_kw, daily_yield_kwh, battery_soc, grid_power_kw, timestamp) VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(m.sourceId, m.acPowerKw, m.dailyYieldKwh, m.batterySoc, m.gridPowerKw, m.timestamp)
        );
        await env.DB.batch(stmts);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markSourcePolled(env.DB, source.id, msg);
    }
  }

  if (allMetrics.length > 0) {
    const existing = await env.TELEMETRY_KV.get("metrics:latest");
    const prev: NormalizedMetric[] = existing ? JSON.parse(existing) : [];

    const merged = new Map<string, NormalizedMetric>();
    for (const m of prev) {
      merged.set(`${m.provider}:${m.sourceId}`, m);
    }
    for (const m of allMetrics) {
      merged.set(`${m.provider}:${m.sourceId}`, m);
    }

    await env.TELEMETRY_KV.put(
      "metrics:latest",
      JSON.stringify(Array.from(merged.values())),
      { expirationTtl: METRICS_KV_TTL }
    );
  }
}

async function rollupAndPrune(env: Env): Promise<void> {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO daily_summaries (source_id, log_date, total_kwh, peak_kw, sample_count)
     SELECT
       source_id,
       date(timestamp) as log_date,
       MAX(daily_yield_kwh) as total_kwh,
       MAX(ac_power_kw) as peak_kw,
       COUNT(*) as sample_count
     FROM telemetry_logs
     WHERE timestamp < datetime('now', '-90 days')
     GROUP BY source_id, date(timestamp)`
  ).run();

  await env.DB.prepare(
    `DELETE FROM telemetry_logs WHERE timestamp < datetime('now', '-90 days')`
  ).run();
}

async function preAggregateCharts(env: Env): Promise<void> {
  const { results: sources } = await env.DB
    .prepare(`SELECT id FROM sources`)
    .all<{ id: number }>();

  for (const source of sources) {
    const { results: summaries } = await env.DB
      .prepare(
        `SELECT log_date, total_kwh, peak_kw, sample_count
         FROM daily_summaries
         WHERE source_id = ?
         ORDER BY log_date DESC
         LIMIT 90`
      )
      .bind(source.id)
      .all();

    if (summaries.length > 0) {
      await env.TELEMETRY_KV.put(
        `chart:${source.id}:90d`,
        JSON.stringify(summaries),
        { expirationTtl: CHART_KV_TTL_SECONDS }
      );
    }
  }
}
