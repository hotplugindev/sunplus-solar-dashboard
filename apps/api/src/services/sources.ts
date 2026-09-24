import type { ProviderId, Source } from "@sunplus/shared";

interface SourceRow {
  id: number;
  name: string;
  provider: string;
  config: string;
  is_active: number;
  poll_interval_minutes: number;
  last_polled_at: string | null;
  last_error: string | null;
  created_at: string;
}

function rowToSource(row: SourceRow): Source {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider as ProviderId,
    config: JSON.parse(row.config) as Record<string, string>,
    isActive: row.is_active === 1,
    pollIntervalMinutes: row.poll_interval_minutes,
    lastPolledAt: row.last_polled_at,
    lastError: row.last_error,
    createdAt: row.created_at,
  };
}

export async function listSources(db: D1Database): Promise<Source[]> {
  const { results } = await db.prepare(`SELECT * FROM sources ORDER BY name ASC`).all<SourceRow>();
  return results.map(rowToSource);
}

export async function getSource(db: D1Database, id: number): Promise<Source | null> {
  const row = await db.prepare(`SELECT * FROM sources WHERE id = ?`).bind(id).first<SourceRow>();
  return row ? rowToSource(row) : null;
}

export async function createSource(
  db: D1Database,
  input: { name: string; provider: string; config: Record<string, string>; pollIntervalMinutes: number }
): Promise<Source> {
  await db
    .prepare(
      `INSERT INTO sources (name, provider, config, poll_interval_minutes) VALUES (?, ?, ?, ?)`
    )
    .bind(input.name, input.provider, JSON.stringify(input.config), input.pollIntervalMinutes)
    .run();

  const row = await db.prepare(`SELECT * FROM sources ORDER BY id DESC LIMIT 1`).first<SourceRow>();
  if (!row) throw new Error("Failed to create source");
  return rowToSource(row);
}

export async function updateSource(
  db: D1Database,
  id: number,
  input: { name?: string; config?: Record<string, string>; isActive?: boolean; pollIntervalMinutes?: number }
): Promise<Source | null> {
  const sets: string[] = [];
  const params: Array<string | number> = [];

  if (input.name !== undefined) {
    sets.push("name = ?");
    params.push(input.name);
  }
  if (input.config !== undefined) {
    sets.push("config = ?");
    params.push(JSON.stringify(input.config));
  }
  if (input.isActive !== undefined) {
    sets.push("is_active = ?");
    params.push(input.isActive ? 1 : 0);
  }
  if (input.pollIntervalMinutes !== undefined) {
    sets.push("poll_interval_minutes = ?");
    params.push(input.pollIntervalMinutes);
  }

  if (sets.length === 0) return getSource(db, id);

  await db
    .prepare(`UPDATE sources SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...params, id)
    .run();

  return getSource(db, id);
}

export async function deleteSource(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare(`DELETE FROM sources WHERE id = ?`).bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function getActiveSources(db: D1Database): Promise<SourceRow[]> {
  const { results } = await db
    .prepare(`SELECT * FROM sources WHERE is_active = 1`)
    .all<SourceRow>();
  return results;
}

export async function markSourcePolled(
  db: D1Database,
  id: number,
  error: string | null
): Promise<void> {
  await db
    .prepare(`UPDATE sources SET last_polled_at = ?, last_error = ? WHERE id = ?`)
    .bind(new Date().toISOString(), error, id)
    .run();
}
