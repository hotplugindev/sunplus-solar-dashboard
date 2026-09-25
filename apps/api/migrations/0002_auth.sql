CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

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

CREATE INDEX IF NOT EXISTS idx_provider_auth_source ON provider_auth(source_id);
