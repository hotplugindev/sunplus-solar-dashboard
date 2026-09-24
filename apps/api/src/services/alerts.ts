import type { Alert, AlertSeverity } from "@sunplus/shared";

interface AlertRow {
  id: number;
  device_id: string;
  severity: AlertSeverity;
  message: string;
  is_resolved: number;
  created_at: string;
  resolved_at: string | null;
}

function rowToAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    deviceId: row.device_id,
    severity: row.severity,
    message: row.message,
    isResolved: row.is_resolved === 1,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export async function listAlerts(
  db: D1Database,
  opts: { deviceId?: string; unresolvedOnly?: boolean; limit?: number } = {}
): Promise<Alert[]> {
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (opts.deviceId) {
    conditions.push("device_id = ?");
    params.push(opts.deviceId);
  }
  if (opts.unresolvedOnly) {
    conditions.push("is_resolved = 0");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(opts.limit ?? 100, 500);

  const { results } = await db
    .prepare(
      `SELECT * FROM alerts ${where} ORDER BY created_at DESC LIMIT ?`
    )
    .bind(...params, limit)
    .all<AlertRow>();

  return results.map(rowToAlert);
}

export async function resolveAlert(db: D1Database, alertId: number): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE alerts SET is_resolved = 1, resolved_at = ? WHERE id = ? AND is_resolved = 0`
    )
    .bind(new Date().toISOString(), alertId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}
