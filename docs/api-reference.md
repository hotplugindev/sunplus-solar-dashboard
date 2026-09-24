# API Reference

Base URL: `/api/v1`

All endpoints require authentication via `Authorization: Bearer <API_KEY>` header.

## Authentication

Two API key roles exist:

| Role | Key | Access |
|---|---|---|
| `device` | `DEVICE_API_KEY` | Telemetry ingestion, read endpoints |
| `admin` | `ADMIN_API_KEY` | All device-role endpoints + device registration + alert resolution |

---

## Telemetry

### POST /api/v1/telemetry/ingest

Ingest a telemetry reading from a solar device.

**Auth**: `device` or `admin`

**Request Body**:
```json
{
  "deviceId": "solar-inv-0842",
  "voltage": 380.5,
  "current": 12.4,
  "temperatureC": 42.1,
  "efficiencyPct": 96.8
}
```

**Validation** (Zod):
- `deviceId`: string, 1-128 chars
- `voltage`: number, > 0, max 2000
- `current`: number, > 0, max 5000
- `temperatureC`: number, -60 to 150
- `efficiencyPct`: number, 0 to 100

**Behavior**:
1. Validates payload via Zod
2. Computes `powerOutputKw = (voltage * current) / 1000`
3. Inserts into `telemetry_logs` and updates `devices.last_seen_at`
4. Creates alerts if thresholds exceeded (temp > 65C, efficiency < 80%)
5. Conditionally updates KV snapshot (delta filtering / fault bypass / heartbeat)

**Response** `201`:
```json
{
  "accepted": true,
  "deviceId": "solar-inv-0842",
  "powerOutputKw": 4.718,
  "alertsCreated": 0
}
```

**Errors**: `400` (validation), `404` (device not found)

---

## Devices

### GET /api/v1/devices

List all registered devices.

**Response** `200`:
```json
{
  "devices": [
    {
      "id": "solar-inv-001",
      "name": "Inverter A",
      "siteLocation": "Rooftop East",
      "capacityKw": 50.0,
      "status": "online",
      "installedAt": "2024-01-15T00:00:00Z",
      "lastSeenAt": "2024-12-30T14:30:00Z"
    }
  ]
}
```

### GET /api/v1/devices/latest

Coalesced endpoint returning all devices with their latest KV telemetry snapshot. Serves the dashboard in a single request.

**Cache**: `Cache-Control: public, max-age=3600, s-maxage=3600`

**Response** `200`:
```json
{
  "devices": [
    {
      "device": { "id": "solar-inv-001", "name": "...", "..." : "..." },
      "telemetry": {
        "deviceId": "solar-inv-001",
        "voltage": 380.5,
        "current": 12.4,
        "powerOutputKw": 4.718,
        "temperatureC": 42.1,
        "efficiencyPct": 96.8,
        "timestamp": "2024-12-30T14:30:00Z"
      }
    }
  ]
}
```

### POST /api/v1/devices/register

Register a new device. **Requires admin role.**

**Request Body**:
```json
{
  "id": "solar-inv-002",
  "name": "Inverter B",
  "siteLocation": "Rooftop West",
  "capacityKw": 75.0
}
```

**Response** `201`: `{ "device": { ... } }`
**Errors**: `400` (validation), `403` (not admin), `409` (already exists)

### GET /api/v1/devices/:id

Get a single device by ID.

**Response** `200`: `{ "device": { ... } }`
**Errors**: `404`

### GET /api/v1/devices/:id/telemetry/latest

Get latest telemetry snapshot from KV.

**Cache**: `Cache-Control: public, max-age=3600, s-maxage=3600`

**Response** `200`: `{ "telemetry": { ... } }`
**Errors**: `404` (device not found or no telemetry yet)

### GET /api/v1/devices/:id/telemetry/history?range=24h

Get historical telemetry from D1.

**Query Params**:
- `range`: `1h` | `6h` | `24h` | `7d` | `30d` (default: `24h`)

**Cache**: `Cache-Control: public, max-age=3600, s-maxage=3600`

**Behavior**: For `30d` range, serves pre-aggregated data from KV (`chart:{id}:90d`) if available; otherwise queries D1.

**Response** `200`:
```json
{
  "deviceId": "solar-inv-001",
  "range": "24h",
  "telemetry": [
    {
      "deviceId": "solar-inv-001",
      "voltage": 380.5,
      "current": 12.4,
      "powerOutputKw": 4.718,
      "temperatureC": 42.1,
      "efficiencyPct": 96.8,
      "timestamp": "2024-12-30T14:30:00Z"
    }
  ]
}
```

### GET /api/v1/devices/:id/chart/90d

Get pre-aggregated 90-day daily chart data from KV.

**Cache**: `Cache-Control: public, max-age=3600, s-maxage=3600`

**Response** `200`:
```json
{
  "deviceId": "solar-inv-001",
  "data": [
    {
      "log_date": "2024-12-01",
      "total_kwh": 42.5,
      "peak_kw": 48.2,
      "avg_voltage": 378.1,
      "avg_temperature_c": 38.4,
      "sample_count": 2880
    }
  ]
}
```

---

## Alerts

### GET /api/v1/alerts

List alerts with optional filters.

**Query Params**:
- `deviceId` (optional): filter by device
- `unresolved` (optional): `true` to show only unresolved alerts
- `limit` (optional): max results (default 100, max 500)

**Response** `200`:
```json
{
  "alerts": [
    {
      "id": 1,
      "deviceId": "solar-inv-001",
      "severity": "critical",
      "message": "High temperature detected: 72.3C (threshold 65C)",
      "isResolved": false,
      "createdAt": "2024-12-30T14:30:00Z",
      "resolvedAt": null
    }
  ]
}
```

### POST /api/v1/alerts/resolve

Resolve an alert. **Requires admin role.**

**Request Body**:
```json
{
  "alertId": 1
}
```

**Response** `200`: `{ "success": true }`
**Errors**: `400` (validation), `403` (not admin), `404` (not found or already resolved)

---

## Health

### GET /health

No authentication required.

**Response** `200`: `{ "status": "ok", "timestamp": "2024-12-30T14:30:00Z" }`
