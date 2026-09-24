CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    site_location TEXT NOT NULL,
    capacity_kw REAL NOT NULL,
    status TEXT CHECK(status IN ('online', 'degraded', 'offline', 'maintenance')) DEFAULT 'offline',
    installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME
);

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

CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON telemetry_logs(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_device ON alerts(device_id, is_resolved);
