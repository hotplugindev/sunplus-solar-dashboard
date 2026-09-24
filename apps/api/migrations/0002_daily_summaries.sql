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

CREATE INDEX IF NOT EXISTS idx_daily_summaries_device_date ON daily_telemetry_summaries(device_id, log_date DESC);
