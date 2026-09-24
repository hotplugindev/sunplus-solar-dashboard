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

CREATE INDEX IF NOT EXISTS idx_telemetry_source_time ON telemetry_logs(source_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_source_date ON daily_telemetry_summaries(source_id, log_date DESC);
