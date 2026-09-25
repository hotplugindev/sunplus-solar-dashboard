import type { ProviderId, Source } from "@sunplus/shared";
import type { ProviderAuth } from "./providers/types";

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

export async function getActiveSourcesWithAuth(db: D1Database): Promise<Array<{ source: Source; auth: ProviderAuth | null }>> {
  const { results } = await db
    .prepare(`SELECT * FROM sources WHERE is_active = 1`)
    .all<SourceRow>();

  const out: Array<{ source: Source; auth: ProviderAuth | null }> = [];

  for (const row of results) {
    const source = rowToSource(row);
    const authRow = await db
      .prepare(`SELECT * FROM provider_auth WHERE source_id = ? LIMIT 1`)
      .bind(row.id)
      .first<ProviderAuth>();
    out.push({ source, auth: authRow || null });
  }

  return out;
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

export async function upsertProviderAuth(
  db: D1Database,
  sourceId: number,
  input: Partial<ProviderAuth>
): Promise<void> {
  const existing = await db.prepare(`SELECT id FROM provider_auth WHERE source_id = ?`).bind(sourceId).first();

  if (existing) {
    const sets: string[] = [];
    const params: Array<string | number | null> = [];

    const fields: Array<keyof ProviderAuth> = [
      "username", "password_hash", "api_key", "oauth_client_id",
      "oauth_client_secret", "oauth_access_token", "oauth_refresh_token",
      "oauth_token_expiry", "extra_config",
    ];

    for (const f of fields) {
      if (input[f] !== undefined) {
        const col = f.replace(/([A-Z])/g, "_$1").toLowerCase();
        sets.push(`${col} = ?`);
        params.push(input[f] as string | number | null);
      }
    }

    if (sets.length > 0) {
      sets.push("updated_at = CURRENT_TIMESTAMP");
      params.push(sourceId);
      await db.prepare(`UPDATE provider_auth SET ${sets.join(", ")} WHERE source_id = ?`).bind(...params).run();
    }
  } else {
    await db.prepare(
      `INSERT INTO provider_auth (source_id, username, password_hash, api_key, oauth_client_id, oauth_client_secret, oauth_access_token, oauth_refresh_token, oauth_token_expiry, extra_config)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      sourceId,
      input.username || null,
      input.password_hash || null,
      input.api_key || null,
      input.oauth_client_id || null,
      input.oauth_client_secret || null,
      input.oauth_access_token || null,
      input.oauth_refresh_token || null,
      input.oauth_token_expiry || null,
      input.extra_config || "{}"
    ).run();
  }
}

export async function getProviderAuth(db: D1Database, sourceId: number): Promise<ProviderAuth | null> {
  return await db.prepare(`SELECT * FROM provider_auth WHERE source_id = ?`).bind(sourceId).first<ProviderAuth>();
}

export async function deleteProviderAuth(db: D1Database, sourceId: number): Promise<void> {
  await db.prepare(`DELETE FROM provider_auth WHERE source_id = ?`).bind(sourceId).run();
}
