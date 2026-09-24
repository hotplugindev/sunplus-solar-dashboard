# Database Schema

Cloudflare D1 (SQLite-compatible) stores relational data. Migrations live in `apps/api/migrations/`.

## Tables

### devices

Device registry and metadata.

```sql
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    site_location TEXT NOT NULL,
    capacity_kw REAL NOT NULL,
    status TEXT CHECK(status IN ('online', 'degraded', 'offline', 'maintenance')) DEFAULT 'offline',
    installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME
);
```

| Column | Type | Description |
|---|---|---|
| `id` | TEXT (PK) | Unique device identifier (e.g. `solar-inv-0842`) |
| `name` | TEXT | Human-readable device name |
| `site_location` | TEXT | Physical installation location |
| `capacity_kw` | REAL | Maximum rated capacity in kW |
| `status` | TEXT | `online`, `degraded`, `offline`, `maintenance` |
| `installed_at` | DATETIME | Installation date |
| `last_seen_at` | DATETIME | Last telemetry ingestion timestamp |

### telemetry_logs

High-frequency time-series telemetry readings.

```sql
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    voltage REAL NOT NULL,
    current REAL NOT NULL,
    power_output_kw REAL NOT NULL,
    temperature_c REAL NOT NULL,
    efficiency_pct REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);
```

### alerts

System fault and threshold alerts.

```sql
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    severity TEXT CHECK(severity IN ('info', 'warning', 'critical')) NOT NULL,
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);
```

### daily_telemetry_summaries

Pre-aggregated daily rollups (created by cron for data older than 90 days).

```sql
CREATE TABLE IF NOT EXISTS daily_telemetry_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    log_date TEXT NOT NULL,
    total_kwh REAL NOT NULL DEFAULT 0,
    peak_kw REAL NOT NULL DEFAULT 0,
    avg_voltage REAL NOT NULL DEFAULT 0,
    avg_temperature_c REAL NOT NULL DEFAULT 0,
    sample_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    UNIQUE(device_id, log_date)
);
```

## Indexes

```sql
CREATE INDEX idx_telemetry_device_time ON telemetry_logs(device_id, timestamp DESC);
CREATE INDEX idx_alerts_device ON alerts(device_id, is_resolved);
CREATE INDEX idx_daily_summaries_device_date ON daily_telemetry_summaries(device_id, log_date DESC);
```

## Data Lifecycle

1. **0-90 days**: Raw telemetry in `telemetry_logs`, queried directly for charts
2. **>90 days**: Rolled up into `daily_telemetry_summaries` by the daily cron, then pruned from `telemetry_logs`
3. **KV cache**: Latest snapshot per device + pre-aggregated 90-day chart JSON

## Migrations

| File | Description |
|---|---|
| `0001_init.sql` | Core tables: devices, telemetry_logs, alerts + indexes |
| `0002_daily_summaries.sql` | daily_telemetry_summaries table + index |

Run migrations:
```bash
# Local
pnpm --filter api wrangler d1 migrations apply DB --local

# Remote
pnpm --filter api wrangler d1 migrations apply DB --remote
```
