import type { AlertSeverity, IngestResult, TelemetryIngestPayload, TelemetrySample } from "@sunplus/shared";
import { ALERT_THRESHOLDS } from "@sunplus/shared";

const KV_TTL_SECONDS = 86_400;
const DELTA_THRESHOLD_PCT = 15;
const HEARTBEAT_INTERVAL_MS = 60 * 60 * 1000;

export async function ingestTelemetry(
  env: Env,
  payload: TelemetryIngestPayload
): Promise<IngestResult> {
  const powerOutputKw = Number(((payload.voltage * payload.current) / 1000).toFixed(3));
  const timestamp = new Date().toISOString();

  const results = await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO telemetry_logs (device_id, voltage, current, power_output_kw, temperature_c, efficiency_pct, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      payload.deviceId,
      payload.voltage,
      payload.current,
      powerOutputKw,
      payload.temperatureC,
      payload.efficiencyPct,
      timestamp
    ),
    env.DB.prepare(
      `UPDATE devices SET last_seen_at = ?, status = CASE WHEN status = 'offline' THEN 'online' ELSE status END WHERE id = ?`
    ).bind(timestamp, payload.deviceId),
  ]);

  const deviceUpdated = results[1]?.meta.changes ?? 0;
  if (deviceUpdated === 0) {
    throw new DeviceNotFoundError(payload.deviceId);
  }

  const alertsCreated = await maybeCreateAlerts(env, payload, timestamp);

  const snapshot: TelemetrySample = {
    deviceId: payload.deviceId,
    voltage: payload.voltage,
    current: payload.current,
    powerOutputKw,
    temperatureC: payload.temperatureC,
    efficiencyPct: payload.efficiencyPct,
    timestamp,
  };

  const shouldWriteKv = await shouldUpdateKv(env, payload.deviceId, snapshot);

  if (shouldWriteKv) {
    await env.TELEMETRY_KV.put(
      `latest:${payload.deviceId}`,
      JSON.stringify(snapshot),
      { expirationTtl: KV_TTL_SECONDS }
    );
  }

  return {
    accepted: true,
    deviceId: payload.deviceId,
    powerOutputKw,
    alertsCreated,
  };
}

async function shouldUpdateKv(
  env: Env,
  deviceId: string,
  newSnapshot: TelemetrySample
): Promise<boolean> {
  if (isFaultCondition(newSnapshot)) {
    return true;
  }

  const raw = await env.TELEMETRY_KV.get(`latest:${deviceId}`);
  if (!raw) {
    return true;
  }

  const cached = JSON.parse(raw) as TelemetrySample;

  const lastUpdateMs = new Date(cached.timestamp).getTime();
  const nowMs = Date.now();
  if (nowMs - lastUpdateMs > HEARTBEAT_INTERVAL_MS) {
    return true;
  }

  if (cached.powerOutputKw === 0 && newSnapshot.powerOutputKw === 0) {
    return false;
  }

  const base = cached.powerOutputKw === 0 ? newSnapshot.powerOutputKw : cached.powerOutputKw;
  const deltaPct = Math.abs(newSnapshot.powerOutputKw - cached.powerOutputKw) / base * 100;

  return deltaPct >= DELTA_THRESHOLD_PCT;
}

function isFaultCondition(snapshot: TelemetrySample): boolean {
  if (snapshot.temperatureC > ALERT_THRESHOLDS.temperatureC) {
    return true;
  }
  if (snapshot.voltage < 100 || snapshot.voltage > 1500) {
    return true;
  }
  if (snapshot.efficiencyPct < ALERT_THRESHOLDS.efficiencyPct) {
    return true;
  }
  return false;
}

async function maybeCreateAlerts(
  env: Env,
  payload: TelemetryIngestPayload,
  timestamp: string
): Promise<number> {
  const alerts: Array<{ severity: AlertSeverity; message: string }> = [];

  if (payload.temperatureC > ALERT_THRESHOLDS.temperatureC) {
    alerts.push({
      severity: "critical",
      message: `High temperature detected: ${payload.temperatureC}C (threshold ${ALERT_THRESHOLDS.temperatureC}C)`,
    });
  }

  if (payload.efficiencyPct < ALERT_THRESHOLDS.efficiencyPct) {
    alerts.push({
      severity: "warning",
      message: `Low efficiency detected: ${payload.efficiencyPct}% (threshold ${ALERT_THRESHOLDS.efficiencyPct}%)`,
    });
  }

  if (alerts.length === 0) {
    return 0;
  }

  const statements = alerts.map((alert) =>
    env.DB.prepare(
      `INSERT INTO alerts (device_id, severity, message, is_resolved, created_at)
       VALUES (?, ?, ?, 0, ?)`
    ).bind(payload.deviceId, alert.severity, alert.message, timestamp)
  );

  if (alerts.some((a) => a.severity === "critical")) {
    statements.push(
      env.DB.prepare(`UPDATE devices SET status = 'degraded' WHERE id = ?`).bind(
        payload.deviceId
      )
    );
  }

  await env.DB.batch(statements);
  return alerts.length;
}

export class DeviceNotFoundError extends Error {
  constructor(deviceId: string) {
    super(`Device not found: ${deviceId}`);
    this.name = "DeviceNotFoundError";
  }
}
