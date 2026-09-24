# Frontend Architecture

## Stack

- **React 18** with TypeScript
- **Vite** for dev server and bundling
- **Tailwind CSS** for styling
- **Recharts** for time-series charts
- **Lucide React** for icons
- **React Router** for client-side routing

## Pages

| Route | Page | Description |
|---|---|---|
| `/dashboard` | Dashboard | Overview: stats cards, device grid, active alerts |
| `/analytics` | Analytics | Device selector, time range picker, 4 metric charts |
| `/devices/:id` | Device Detail | Single device: live telemetry, 24h charts, alert history |
| `/settings` | Settings | Device registration form |

## Data Fetching

All data fetching uses the `usePolling` hook which:
- Polls at a configurable interval
- **Pauses polling when the tab is hidden** (`document.visibilitychange`)
- Resumes immediately when the tab becomes visible again
- Provides `data`, `loading`, `error`, and `refetch` state

### Hooks

| Hook | Endpoint | Interval | Purpose |
|---|---|---|---|
| `useDevices` | `GET /api/v1/devices/latest` | 15s | All devices + latest telemetry (coalesced) |
| `useDeviceTelemetry` | `GET /api/v1/devices/:id/telemetry/latest` | 5s | Single device live snapshot |
| `useTelemetryHistory` | `GET /api/v1/devices/:id/telemetry/history` | 30s | Historical chart data |
| `useAlerts` | `GET /api/v1/alerts` | 15s | Alert feed |

### API Client

`src/lib/api.ts` provides a typed fetch wrapper:
- Automatic JSON serialization
- Error handling with `ApiError` class (status + message)
- Configurable base URL via `VITE_API_URL` env var

## Components

| Component | Purpose |
|---|---|
| `Layout` | Sidebar navigation + outlet |
| `DeviceList` | Grid of device cards with status indicators |
| `TelemetryCard` | 4-metric live reading display (power, voltage, temp, efficiency) |
| `PowerChart` | Recharts area chart wrapper with gradient fill |
| `AlertFeed` | Severity-colored alert list with timestamps |

## Development Proxy

Vite dev server proxies `/api` requests to `http://localhost:8787` (Wrangler dev server), so no CORS issues during local development.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `""` (same origin) | API base URL for production deployments |
