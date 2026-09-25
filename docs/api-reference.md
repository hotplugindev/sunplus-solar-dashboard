# API Reference

Base URL: `/api/v1`

## Authentication

All endpoints except `/setup/*` require a Bearer token in the `Authorization` header. The token is the plaintext password (admin or dashboard) that was set during initialization. The server verifies it against the stored PBKDF2-SHA256 hash.

| Role | Access |
|---|---|
| `admin` | All endpoints including source management |
| `dashboard` | Metrics and public endpoints only |

---

## Setup

### GET /api/v1/setup/status

Check if the system has been initialized.

**Auth**: None

**Response** `200`:
```json
{
  "setupComplete": true
}
```

### POST /api/v1/setup/initialize

Initialize the system with admin and dashboard passwords. Can only be called once.

**Auth**: None

**Request Body**:
```json
{
  "admin_password": "strong-admin-password",
  "dashboard_password": "dashboard-viewing-password"
}
```

**Response** `201`: `{ "status": "initialized" }`
**Errors**: `409` (already initialized)

### POST /api/v1/setup/login

Authenticate with a password to verify credentials.

**Auth**: None

**Request Body**:
```json
{
  "password": "dashboard-viewing-password",
  "role": "dashboard"
}
```

**Response** `200`:
```json
{
  "token": "dashboard-viewing-password",
  "role": "dashboard"
}
```

**Errors**: `401` (invalid password or not initialized)

---

## Sources

### GET /api/v1/sources

List all configured sources.

**Auth**: Any

**Response** `200`:
```json
{
  "sources": [
    {
      "id": 1,
      "name": "Home Array",
      "provider": "sma",
      "isActive": true,
      "pollIntervalMinutes": 15,
      "lastPolledAt": "2024-12-30T14:30:00Z",
      "lastError": null,
      "createdAt": "2024-12-30T10:00:00Z"
    }
  ]
}
```

### POST /api/v1/sources

Create a new source with provider authentication.

**Auth**: Admin required

**Request Body**:
```json
{
  "name": "Home Array",
  "provider": "sma",
  "config": {},
  "pollIntervalMinutes": 15,
  "auth": {
    "oauth_client_id": "client-id",
    "oauth_client_secret": "client-secret",
    "extra_config": {
      "baseUrl": "https://api.smaapis.de",
      "authUrl": "https://auth.smaapis.de",
      "loginHint": "user@example.com"
    }
  }
}
```

**Response** `201`: `{ "source": { ... } }`

### GET /api/v1/sources/:id

Get a single source and its auth configuration.

**Auth**: Any

**Response** `200`: `{ "source": { ... }, "auth": { ... } }`

### PATCH /api/v1/sources/:id

Update a source and optionally its auth.

**Auth**: Admin required

### DELETE /api/v1/sources/:id

Delete a source and its associated auth.

**Auth**: Admin required

### PUT /api/v1/sources/:id/auth

Update only the authentication credentials for a source.

**Auth**: Admin required

---

## Metrics

### GET /api/v1/metrics

Poll all active providers on-demand and return fresh metrics.

**Auth**: Any

**Cache**: `Cache-Control: public, max-age=60, s-maxage=60`

**Response** `200`:
```json
{
  "metrics": [
    {
      "sourceId": 1,
      "sourceName": "Home Array",
      "provider": "sma",
      "acPowerKw": 4.72,
      "dailyYieldKwh": 32.1,
      "batterySoc": null,
      "gridPowerKw": null,
      "timestamp": "2024-12-30T14:30:00Z"
    }
  ],
  "timestamp": "2024-12-30T14:30:00Z"
}
```

### GET /api/v1/metrics/cached

Return the latest cached metrics from KV without polling providers.

**Auth**: Any

**Cache**: `Cache-Control: public, max-age=300, s-maxage=300`

### GET /api/v1/metrics/:sourceId/history?range=24h

Get historical telemetry for a source from D1.

**Auth**: Any

**Query Params**:
- `range`: `1h` | `6h` | `24h` | `7d` | `30d` (default: `24h`)

For `30d` range, serves pre-aggregated data from KV if available.

---

## Public

### GET /api/v1/public/metrics

Public-facing metrics endpoint for external dashboards (e.g., Grafana). Returns cached metrics or polls providers if cache is empty.

**Auth**: Dashboard or Admin

**Cache**: `Cache-Control: public, max-age=60, s-maxage=60`

---

## Health

### GET /health

No authentication required.

**Response** `200`: `{ "status": "ok", "timestamp": "2024-12-30T14:30:00Z" }`
