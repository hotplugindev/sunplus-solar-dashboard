# Database Schema

Cloudflare D1 (SQLite-compatible) stores relational data. Migrations live in `apps/api/migrations/`.

## Tables

### app_settings

Key-value store for application configuration including password hashes and setup state.

```sql
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

| Key | Description |
|---|---|
| `admin_password_hash` | PBKDF2-SHA256 hashed admin password |
| `dashboard_password_hash` | PBKDF2-SHA256 hashed dashboard password |
| `setup_complete` | Set to `"true"` after initialization |

### sources

Registered solar installations to poll.

```sql
CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    provider TEXT NOT NULL CHECK(provider IN ('huawei', 'sungrow', 'solaredge', 'sma', 'fronius', 'sigenergy')),
    config TEXT NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT 1,
    poll_interval_minutes INTEGER NOT NULL DEFAULT 5,
    last_polled_at DATETIME,
    last_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER (PK) | Auto-increment ID |
| `name` | TEXT | Human-readable source name |
| `provider` | TEXT | Provider identifier |
| `config` | TEXT | JSON string of additional settings |
| `is_active` | BOOLEAN | Whether this source should be polled |
| `poll_interval_minutes` | INTEGER | Minimum minutes between polls |
| `last_polled_at` | DATETIME | Timestamp of last successful poll |
| `last_error` | TEXT | Last error message from polling |
| `created_at` | DATETIME | Creation time |

### provider_auth

Authentication credentials for each source. One row per source.

```sql
CREATE TABLE IF NOT EXISTS provider_auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    username TEXT,
    password_hash TEXT,
    api_key TEXT,
    oauth_client_id TEXT,
    oauth_client_secret TEXT,
    oauth_access_token TEXT,
    oauth_refresh_token TEXT,
    oauth_token_expiry DATETIME,
    extra_config TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);
```

| Column | Type | Description |
|---|---|---|
| `source_id` | INTEGER (FK) | Parent source |
| `username` | TEXT | Username for basic auth |
| `password_hash` | TEXT | Password for basic/HMAC auth |
| `api_key` | TEXT | Static API key |
| `oauth_client_id` | TEXT | OAuth2 client ID |
| `oauth_client_secret` | TEXT | OAuth2 client secret |
| `oauth_access_token` | TEXT | Cached OAuth2 access token |
| `oauth_refresh_token` | TEXT | OAuth2 refresh token |
| `oauth_token_expiry` | DATETIME | Token expiration timestamp |
| `extra_config` | TEXT | JSON string for provider-specific fields |

### telemetry_logs

Time-series metric readings from provider polls.

```sql
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    ac_power_kw REAL NOT NULL DEFAULT 0,
    daily_yield_kwh REAL NOT NULL DEFAULT 0,
    battery_soc REAL,
    grid_power_kw REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);
```

### daily_telemetry_summaries

Pre-aggregated daily rollups created by cron for data older than 90 days.

```sql
CREATE TABLE IF NOT EXISTS daily_telemetry_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    log_date TEXT NOT NULL,
    total_kwh REAL NOT NULL DEFAULT 0,
    peak_kw REAL NOT NULL DEFAULT 0,
    sample_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
    UNIQUE(source_id, log_date)
);
```

## Indexes

```sql
CREATE INDEX idx_telemetry_source_time ON telemetry_logs(source_id, timestamp DESC);
CREATE INDEX idx_daily_summaries_source_date ON daily_telemetry_summaries(source_id, log_date DESC);
CREATE INDEX idx_provider_auth_source ON provider_auth(source_id);
```

## Data Lifecycle

1. **0-90 days**: Raw telemetry in `telemetry_logs`, queried directly for charts
2. **>90 days**: Rolled up into `daily_telemetry_summaries` by the daily cron, then pruned from `telemetry_logs`
3. **KV cache**: Latest snapshot + pre-aggregated 90-day chart JSON per source

## Migrations

| File | Description |
|---|---|
| `0001_init.sql` | Core tables: sources, telemetry_logs, daily_telemetry_summaries + indexes |
| `0002_auth.sql` | app_settings, provider_auth tables + index |

Run migrations:
```bash
# Local
pnpm --filter api exec wrangler d1 migrations apply DB --local

# Remote
pnpm --filter api exec wrangler d1 migrations apply DB --remote
```
