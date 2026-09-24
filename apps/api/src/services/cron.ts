import type { TelemetrySample } from "@sunplus/shared";

const CHART_KV_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function handleScheduledCron(env: Env): Promise<void> {
  await rollupAndPrune(env);
  await preAggregateCharts(env);
}

async function rollupAndPrune(env: Env): Promise<void> {
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]!;

  await env.DB.prepare(
    `INSERT OR REPLACE INTO daily_telemetry_summaries (device_id, log_date, total_kwh, peak_kw, avg_voltage, avg_temperature_c, sample_count)
     SELECT
       device_id,
       date(timestamp) as log_date,
       SUM(power_output_kw * (1.0 / (SELECT COUNT(*) FROM telemetry_logs t2 WHERE t2.device_id = telemetry_logs.device_id AND date(t2.timestamp) = date(telemetry_logs.timestamp)))) as total_kwh,
       MAX(power_output_kw) as peak_kw,
       AVG(voltage) as avg_voltage,
       AVG(temperature_c) as avg_temperature_c,
       COUNT(*) as sample_count
     FROM telemetry_logs
     WHERE timestamp < datetime('now', '-90 days')
     GROUP BY device_id, date(timestamp)`
  ).run();

  await env.DB.prepare(
    `DELETE FROM telemetry_logs WHERE timestamp < datetime('now', '-90 days')`
  ).run();
}

async function preAggregateCharts(env: Env): Promise<void> {
  const { results: devices } = await env.DB
    .prepare(`SELECT id FROM devices`)
    .all<{ id: string }>();

  for (const device of devices) {
    const { results: summaries } = await env.DB
      .prepare(
        `SELECT log_date, total_kwh, peak_kw, avg_voltage, avg_temperature_c, sample_count
         FROM daily_telemetry_summaries
         WHERE device_id = ?
         ORDER BY log_date DESC
         LIMIT 90`
      )
      .bind(device.id)
      .all();

    if (summaries.length > 0) {
      await env.TELEMETRY_KV.put(
        `chart:${device.id}:90d`,
        JSON.stringify(summaries),
        { expirationTtl: CHART_KV_TTL_SECONDS }
      );
    }
  }
}
