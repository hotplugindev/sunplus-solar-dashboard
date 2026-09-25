# Frontend Architecture

## Stack

- **React 18** with TypeScript
- **Vite** for dev server and bundling
- **Tailwind CSS** for styling
- **Recharts** for time-series charts
- **Lucide React** for icons
- **React Router** for client-side routing

## Authentication Flow

On first load, the app checks `/api/v1/setup/status`. If not initialized, a setup form is shown to create admin and dashboard passwords. After initialization (or on subsequent visits), a login modal prompts for the dashboard password. The password is sent to `/api/v1/setup/login` for verification, then stored in localStorage as a Bearer token for all subsequent API requests. A logout button in the sidebar clears the token.

## Pages

| Route | Page | Description |
|---|---|---|
| `/dashboard` | Dashboard | Overview: stats cards, source metric grid, polls public metrics endpoint |
| `/analytics` | Analytics | Source selector, time range picker, historical charts |
| `/settings` | Settings | Two tabs: Sources (add/manage with auth fields) and Providers (view status) |

## Data Fetching

All data fetching uses the `usePolling` hook which:
- Polls at a configurable interval
- **Pauses polling when the tab is hidden** (`document.visibilitychange`)
- Resumes immediately when the tab becomes visible again
- Provides `data`, `loading`, `error`, and `refetch` state

### Hooks

| Hook | Endpoint | Interval | Purpose |
|---|---|---|---|
| `useMetrics` | `GET /api/v1/public/metrics` | 15s | All sources latest metrics |
| `useTelemetryHistory` | `GET /api/v1/metrics/:sourceId/history` | 60s | Historical chart data |
| `useSources` | `GET /api/v1/sources` | 30s | Source list for settings |

### API Client

`src/lib/api.ts` provides a typed fetch wrapper:
- Automatic JSON serialization
- Attaches Bearer token from localStorage to all requests
- Handles 401/403 by clearing token and dispatching `auth:logout` event
- Error handling with `ApiError` class (status + message)
- Configurable base URL via `VITE_API_URL` env var

## Components

| Component | Purpose |
|---|---|
| `Layout` | Sidebar navigation + outlet + logout button |
| `LoginModal` | Setup form or login form overlay |
| `SourceList` | Grid of source cards with toggle/delete actions |
| `MetricCard` | Single source metric display (power, yield, battery, grid) |
| `MetricsChart` | Recharts line chart wrapper with dark theme |

## Development Proxy

Vite dev server proxies `/api` requests to `http://localhost:8787` (Wrangler dev server), so no CORS issues during local development.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `""` (same origin) | API base URL for production deployments |
