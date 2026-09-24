import type { Device, DeviceStatus, TelemetryRange, TelemetrySample } from "@sunplus/shared";

const RANGE_TO_MS: Record<TelemetryRange, number> = {
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

interface DeviceRow {
  id: string;
  name: string;
  site_location: string;
  capacity_kw: number;
  status: DeviceStatus;
  installed_at: string;
  last_seen_at: string | null;
}

interface TelemetryRow {
  device_id: string;
  voltage: number;
  current: number;
  power_output_kw: number;
  temperature_c: number;
  efficiency_pct: number;
  timestamp: string;
}

function rowToDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    name: row.name,
    siteLocation: row.site_location,
    capacityKw: row.capacity_kw,
    status: row.status,
    installedAt: row.installed_at,
    lastSeenAt: row.last_seen_at,
  };
}

function rowToSample(row: TelemetryRow): TelemetrySample {
  return {
    deviceId: row.device_id,
    voltage: row.voltage,
    current: row.current,
    powerOutputKw: row.power_output_kw,
    temperatureC: row.temperature_c,
    efficiencyPct: row.efficiency_pct,
    timestamp: row.timestamp,
  };
}

export async function listDevices(db: D1Database): Promise<Device[]> {
  const { results } = await db
    .prepare(`SELECT * FROM devices ORDER BY name ASC`)
    .all<DeviceRow>();
  return results.map(rowToDevice);
}

export async function getDevice(db: D1Database, id: string): Promise<Device | null> {
  const row = await db
    .prepare(`SELECT * FROM devices WHERE id = ?`)
    .bind(id)
    .first<DeviceRow>();
  return row ? rowToDevice(row) : null;
}

export async function registerDevice(
  db: D1Database,
  input: { id: string; name: string; siteLocation: string; capacityKw: number }
): Promise<Device> {
  await db
    .prepare(
      `INSERT INTO devices (id, name, site_location, capacity_kw, status) VALUES (?, ?, ?, ?, 'offline')`
    )
    .bind(input.id, input.name, input.siteLocation, input.capacityKw)
    .run();
  const device = await getDevice(db, input.id);
  if (!device) {
    throw new Error("Failed to register device");
  }
  return device;
}

export async function getLatestTelemetry(
  kv: KVNamespace,
  deviceId: string
): Promise<TelemetrySample | null> {
  const raw = await kv.get(`latest:${deviceId}`);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as TelemetrySample;
}

export async function getTelemetryHistory(
  db: D1Database,
  deviceId: string,
  range: TelemetryRange
): Promise<TelemetrySample[]> {
  const since = new Date(Date.now() - RANGE_TO_MS[range]).toISOString();
  const { results } = await db
    .prepare(
      `SELECT device_id, voltage, current, power_output_kw, temperature_c, efficiency_pct, timestamp
       FROM telemetry_logs
       WHERE device_id = ? AND timestamp >= ?
       ORDER BY timestamp ASC`
    )
    .bind(deviceId, since)
    .all<TelemetryRow>();
  return results.map(rowToSample);
}
