CREATE TABLE IF NOT EXISTS poll_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    success INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_poll_metrics_source ON poll_metrics(source_id, created_at DESC);

ALTER TABLE sources ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sources ADD COLUMN circuit_state TEXT NOT NULL DEFAULT 'closed';
ALTER TABLE sources ADD COLUMN last_viewed_at DATETIME;

CREATE UNIQUE INDEX IF NOT EXISTS idx_telemetry_dedup ON telemetry_logs(source_id, timestamp);
