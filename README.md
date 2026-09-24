# SunPlus Solar Dashboard

An end-to-end telemetry ingestion, processing, and visualization platform for solar array monitoring. Ingests high-frequency metrics (voltage, current, temperature, efficiency) from distributed edge devices, aggregates them at the edge, and renders real-time dashboards for monitoring power output, system health, and fault alerts.

## Architecture

```
Solar Inverters ──HTTPS POST──> Cloudflare Worker (Hono)
                                     │           │
                              KV Write│           │D1 Write
                                     ▼           ▼
                              ┌──────────┐  ┌──────────┐
                              │ Workers  │  │  D1 SQL  │
                              │   KV     │  │ Database │
                              └──────────┘  └──────────┘
                                     │           │
                              KV Read│           │SQL Query
                                     ▼           ▼
                              ┌─────────────────────────┐
                              │   React/Vite Dashboard  │
                              └─────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Language | TypeScript (strict) |
| API | Cloudflare Workers + Hono |
| Database | Cloudflare D1 |
| Cache | Cloudflare KV |
| Frontend | React 18 + Vite + Tailwind CSS |
| Charts | Recharts |
| Validation | Zod |

## Project Structure

```
├── apps/
│   ├── api/          # Cloudflare Worker (Hono)
│   │   ├── src/
│   │   │   ├── index.ts          # Fetch + scheduled handlers
│   │   │   ├── routes/           # telemetry, devices, alerts
│   │   │   ├── services/         # ingestion, devices, alerts, cron
│   │   │   └── middleware/       # auth, rate-limit
│   │   ├── migrations/           # D1 SQL migrations
│   │   └── wrangler.jsonc        # Cloudflare bindings config
│   └── web/          # React dashboard
│       └── src/
│           ├── components/       # DeviceList, TelemetryCard, PowerChart, AlertFeed
│           ├── pages/            # Dashboard, Analytics, DeviceDetail, Settings
│           ├── hooks/            # usePolling, useDevices, useAlerts, etc.
│           └── lib/              # API client, utilities
├── packages/
│   ├── shared/       # Zod schemas + TypeScript types
│   └── tsconfig/     # Shared TS config bases
└── docs/             # Architecture, API, DB, deployment docs
```

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 11
- Cloudflare account (for D1/KV)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

Edit `.dev.vars` with your local API keys:
```
DEVICE_API_KEY=your-device-key
ADMIN_API_KEY=your-admin-key
```

### 3. Run Database Migrations (Local)

```bash
pnpm --filter api exec wrangler d1 migrations apply DB --local
```

### 4. Start Development Servers

```bash
pnpm dev
```

This starts:
- API worker at `http://localhost:8787`
- Web dashboard at `http://localhost:3000` (proxies `/api` to :8787)

### 5. Register a Device

```bash
curl -X POST http://localhost:8787/api/v1/devices/register \
  -H "Authorization: Bearer dev-admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{"id": "solar-inv-001", "name": "Inverter A", "siteLocation": "Rooftop East", "capacityKw": 50}'
```

### 6. Ingest Telemetry

```bash
curl -X POST http://localhost:8787/api/v1/telemetry/ingest \
  -H "Authorization: Bearer dev-device-api-key" \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "solar-inv-001", "voltage": 380.5, "current": 12.4, "temperatureC": 42.1, "efficiencyPct": 96.8}'
```

### 7. Open the Dashboard

Visit `http://localhost:3000` to see live device status, telemetry charts, and alerts.

## Key Features

### Telemetry Ingestion with Smart KV Writes

- Delta filtering: skips KV update if power change < 15%
- Fault bypass: immediate KV write on critical anomalies
- Heartbeat: forces KV write if stale for > 1 hour

### Automated Data Lifecycle (Cron)

- Daily rollup of telemetry older than 90 days into daily summaries
- Automatic pruning of raw telemetry beyond 90 days
- Pre-aggregation of 90-day charts into KV for instant dashboard loads

### Real-Time Dashboard

- Coalesced API endpoint (`/devices/latest`) for single-request dashboard loads
- Page visibility throttling (pauses polling when tab is hidden)
- CDN cache headers on all read endpoints

### Alert System

- Automatic alert creation on threshold violations (temp > 65C, efficiency < 80%)
- Severity levels: info, warning, critical
- Device status auto-degradation on critical alerts

## Production Deployment

See [docs/deployment.md](docs/deployment.md) for the full guide. Summary:

```bash
# 1. Create Cloudflare resources
npx wrangler d1 create sunplus-db
npx wrangler kv namespace create TELEMETRY_KV

# 2. Update wrangler.jsonc with real IDs

# 3. Set secrets
npx wrangler secret put DEVICE_API_KEY
npx wrangler secret put ADMIN_API_KEY

# 4. Run remote migrations
pnpm --filter api exec wrangler d1 migrations apply DB --remote

# 5. Deploy worker
pnpm --filter api exec wrangler deploy

# 6. Build and deploy frontend
pnpm --filter web build
npx wrangler pages deploy apps/web/dist --project-name sunplus-web
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all dev servers (API + Web) |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | TypeScript check across all packages |
| `pnpm lint` | Lint (typecheck) all packages |
| `pnpm db:migrate` | Run D1 migrations locally |
| `pnpm db:migrate:remote` | Run D1 migrations on remote |

## Documentation

- [Architecture](docs/architecture.md) - System design and data flow
- [API Reference](docs/api-reference.md) - All endpoints with examples
- [Database Schema](docs/database.md) - Tables, indexes, data lifecycle
- [Frontend](docs/frontend.md) - Pages, components, hooks
- [Deployment](docs/deployment.md) - Step-by-step production setup
