import type { NormalizedMetric } from "@sunplus/shared";
import { getAdapter } from "./providers";
import { getActiveSourcesWithAuth, markSourcePolled } from "./sources";

const METRICS_KV_TTL = 3600;
const CHART_KV_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;
const CIRCUIT_OPEN_THRESHOLD = 5;
const CIRCUIT_HALF_OPEN_AFTER_MS = 15 * 60 * 1000;

interface PollResult {
  sourceId: number;
  success: boolean;
  metricsCount: number;
  durationMs: number;
  error?: string;
}

async function pollWithRetry(
  adapter: ReturnType<typeof getAdapter>,
  auth: NonNullable<Awaited<ReturnType<typeof getActiveSourcesWithAuth>>[number]["auth"]>
): Promise<NormalizedMetric[]> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await adapter!.poll(auth);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

export async function handleScheduledCron(env: Env): Promise<void> {
  console.log(JSON.stringify({ level: "info", msg: "cron_started", ts: new Date().toISOString() }));

  const results = await pollProviders(env);
  await rollupAndPrune(env);
  await preAggregateCharts(env);

  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    console.warn(JSON.stringify({
      level: "warn",
      msg: "cron_source_failures",
      count: failed.length,
      sources: failed.map((f) => f.sourceId),
      ts: new Date().toISOString(),
    }));
  }

  console.log(JSON.stringify({
    level: "info",
    msg: "cron_completed",
    total: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: failed.length,
    ts: new Date().toISOString(),
  }));
}

async function pollProviders(env: Env): Promise<PollResult[]> {
  const sources = await getActiveSourcesWithAuth(env.DB);
  const allMetrics: NormalizedMetric[] = [];
  const now = Date.now();
  const results: PollResult[] = [];

  const pollTasks = sources.map(async ({ source, auth }): Promise<PollResult> => {
    const start = Date.now();

    if (source.lastPolledAt) {
      const lastMs = new Date(source.lastPolledAt).getTime();
      const intervalMs = source.pollIntervalMinutes * 60 * 1000;
      if (now - lastMs < intervalMs) {
        return { sourceId: source.id, success: true, metricsCount: 0, durationMs: 0 };
      }
    }

    if (source.circuitState === "open") {
      const lastPoll = source.lastPolledAt ? new Date(source.lastPolledAt).getTime() : 0;
      if (now - lastPoll < CIRCUIT_HALF_OPEN_AFTER_MS) {
        return { sourceId: source.id, success: false, metricsCount: 0, durationMs: 0, error: "circuit_open" };
      }
      await env.DB.prepare("UPDATE sources SET circuit_state = 'half-open' WHERE id = ?").bind(source.id).run();
    }

    const adapter = getAdapter(source.provider as NormalizedMetric["provider"], env.DB);
    if (!adapter || !auth) {
      return { sourceId: source.id, success: false, metricsCount: 0, durationMs: Date.now() - start, error: "no_adapter_or_auth" };
    }

    try {
      const metrics = await pollWithRetry(adapter, auth);

      for (const m of metrics) {
        m.sourceId = source.id;
        m.sourceName = source.name;
      }

      allMetrics.push(...metrics);
      await markSourcePolled(env.DB, source.id, null);

      if (source.consecutiveFailures > 0) {
        await env.DB.prepare("UPDATE sources SET consecutive_failures = 0, circuit_state = 'closed' WHERE id = ?").bind(source.id).run();
      }

      if (metrics.length > 0) {
        const stmts = metrics.map((m) =>
          env.DB.prepare(
            `INSERT INTO telemetry_logs (source_id, ac_power_kw, daily_yield_kwh, battery_soc, grid_power_kw, timestamp)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(source_id, timestamp) DO UPDATE SET
               ac_power_kw = excluded.ac_power_kw,
               daily_yield_kwh = excluded.daily_yield_kwh,
               battery_soc = excluded.battery_soc,
               grid_power_kw = excluded.grid_power_kw`
          ).bind(m.sourceId, m.acPowerKw, m.dailyYieldKwh, m.batterySoc, m.gridPowerKw, m.timestamp)
        );
        for (let i = 0; i < stmts.length; i += 50) {
          await env.DB.batch(stmts.slice(i, i + 50));
        }
      }

      const durationMs = Date.now() - start;
      await env.DB.prepare(
        `INSERT INTO poll_metrics (source_id, duration_ms, success, created_at) VALUES (?, ?, 1, ?)`
      ).bind(source.id, durationMs, new Date().toISOString()).run();

      return { sourceId: source.id, success: true, metricsCount: metrics.length, durationMs };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - start;
      await markSourcePolled(env.DB, source.id, msg);

      const failures = source.consecutiveFailures + 1;
      const circuitState = failures >= CIRCUIT_OPEN_THRESHOLD ? "open" : source.circuitState;

      await env.DB.prepare(
        "UPDATE sources SET consecutive_failures = ?, circuit_state = ? WHERE id = ?"
      ).bind(failures, circuitState, source.id).run();

      await env.DB.prepare(
        `INSERT INTO poll_metrics (source_id, duration_ms, success, error_message, created_at) VALUES (?, ?, 0, ?, ?)`
      ).bind(source.id, durationMs, msg, new Date().toISOString()).run();

      return { sourceId: source.id, success: false, metricsCount: 0, durationMs, error: msg };
    }
  });

  const settled = await Promise.allSettled(pollTasks);
  for (const result of settled) {
    if (result.status === "fulfilled") {
      results.push(result.value);
    } else {
      results.push({ sourceId: -1, success: false, metricsCount: 0, durationMs: 0, error: String(result.reason) });
    }
  }

  if (allMetrics.length > 0) {
    const existing = await env.TELEMETRY_KV.get("metrics:latest");
    const prev: NormalizedMetric[] = existing ? JSON.parse(existing) : [];

    const merged = new Map<string, NormalizedMetric>();
    for (const m of prev) merged.set(`${m.provider}:${m.sourceId}`, m);
    for (const m of allMetrics) merged.set(`${m.provider}:${m.sourceId}`, m);

    await env.TELEMETRY_KV.put(
      "metrics:latest",
      JSON.stringify(Array.from(merged.values())),
      { expirationTtl: METRICS_KV_TTL }
    );
  }

  return results;
}

async function rollupAndPrune(env: Env): Promise<void> {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO daily_telemetry_summaries (source_id, log_date, total_kwh, peak_kw, sample_count)
     SELECT
       source_id,
       date(timestamp) as log_date,
       MAX(daily_yield_kwh) - MIN(daily_yield_kwh) as total_kwh,
       MAX(ac_power_kw) as peak_kw,
       COUNT(*) as sample_count
     FROM telemetry_logs
     WHERE timestamp < datetime('now', '-90 days')
     GROUP BY source_id, date(timestamp)`
  ).run();

  await env.DB.prepare(
    `DELETE FROM telemetry_logs WHERE timestamp < datetime('now', '-90 days')`
  ).run();

  await env.DB.prepare(
    `DELETE FROM poll_metrics WHERE created_at < datetime('now', '-30 days')`
  ).run();
}

async function preAggregateCharts(env: Env): Promise<void> {
  const { results: activeSources } = await env.DB
    .prepare(`SELECT id FROM sources WHERE is_active = 1 AND last_viewed_at IS NOT NULL`)
    .all<{ id: number }>();

  const { results: allSources } = await env.DB
    .prepare(`SELECT id FROM sources WHERE is_active = 1`)
    .all<{ id: number }>();

  const sourceIds = activeSources.length > 0 ? activeSources : allSources;

  for (const source of sourceIds) {
    const { results: summaries } = await env.DB
      .prepare(
        `SELECT log_date, total_kwh, peak_kw, sample_count
         FROM daily_telemetry_summaries
         WHERE source_id = ?
         ORDER BY log_date DESC
         LIMIT 90`
      )
      .bind(source.id)
      .all();

    if (summaries && summaries.length > 0) {
      await env.TELEMETRY_KV.put(
        `chart:${source.id}:90d`,
        JSON.stringify(summaries),
        { expirationTtl: CHART_KV_TTL_SECONDS }
      );
    }
  }
}
