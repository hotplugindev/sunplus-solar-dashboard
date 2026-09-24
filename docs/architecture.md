# System Architecture

## Overview

SunPlus is a real-time telemetry ingestion, processing, and visualization platform for solar array monitoring. It ingests high-frequency metrics (voltage, current, temperature, efficiency) from distributed edge devices, buffers and aggregates them at the edge, and renders real-time dashboards.

## Data Flow

```
+---------------------+      HTTPS POST (JSON)       +------------------------------+
| Solar Edge Inverter | ---------------------------> | Cloudflare Worker (Hono API) |
| (Telemetry Sender)  |                              +------------------------------+
+---------------------+                                    |              |
                                            Write Snapshot  |              | Log Events
                                            (Low Latency)   v              v & Metrics
                                                     +------------+  +------------+
                                                     | Cloudflare |  | Cloudflare |
                                                     | Workers KV |  |   D1 SQL   |
                                                     +------------+  +------------+
                                                            |              |
                                            Cached Snapshot  |              | Historical
                                            Read (<1ms)      v              v Range Queries
                                                      +----------------------------+
                                                      |  React / Vite Dashboard    |
                                                      +----------------------------+
```

## Component Layers

### 1. Ingestion Layer

Solar inverter micro-controllers stream telemetry payloads every 5-60 seconds via `POST /api/v1/telemetry/ingest`. Each payload includes voltage, current, temperature, and efficiency readings.

### 2. Edge Worker Routing

The Cloudflare Worker uses Hono to handle:
- Bearer token authentication (device vs admin roles)
- Payload validation via Zod schemas
- IP-based rate limiting (token bucket algorithm)
- Route dispatching

### 3. Dual Storage Pattern

| Storage Engine | Primary Use Case | Access Pattern |
|---|---|---|
| **Cloudflare KV** | Latest telemetry snapshots, pre-aggregated charts | High-frequency write / Sub-1ms global read |
| **Cloudflare D1** | Historical metrics, device registry, alert history | Structured SQL queries, time-series aggregations |

### 4. Presentation Layer

The React SPA queries KV (via API endpoints) for rapid device status cards and D1 for long-term power generation trends and analytics.

## KV Write Optimization

To protect the 1,000 KV writes/day free-tier limit, the ingestion service implements:

1. **Delta Filtering**: Skips KV update if power output change is < 15% vs cached snapshot
2. **Fault Bypass**: Immediately writes to KV on critical anomalies (temp > 65C, voltage < 100 or > 1500, efficiency < 80%)
3. **Heartbeat Interval**: Forces a KV write if no update has occurred for > 1 hour

## Scheduled Cron Tasks

A daily cron trigger (`0 0 * * *` UTC midnight) executes:

1. **Rollup**: Aggregates telemetry_logs older than 90 days into `daily_telemetry_summaries`
2. **Prune**: Deletes raw telemetry_logs older than 90 days
3. **Chart Pre-aggregation**: Stores 90-day daily summaries as JSON in KV (`chart:{device_id}:90d`)

## Monorepo Structure

```
/
├── apps/
│   ├── api/                   # Cloudflare Worker (Hono API)
│   │   ├── src/
│   │   │   ├── index.ts       # Fetch handler + scheduled handler
│   │   │   ├── routes/        # Telemetry, Devices, Alerts
│   │   │   ├── services/      # Ingestion, D1 queries, KV, Cron
│   │   │   └── middleware/    # Auth, Rate limiting
│   │   ├── migrations/        # D1 SQL migrations
│   │   └── wrangler.jsonc     # Cloudflare bindings
│   └── web/                   # Vite + React Dashboard
│       └── src/
│           ├── components/    # Telemetry visualizers, alert feeds
│           ├── pages/         # Dashboard, Analytics, Device Detail, Settings
│           ├── hooks/         # Polling, data fetching hooks
│           └── lib/           # API client, utilities
└── packages/
    ├── shared/                # Common types, Zod schemas
    └── tsconfig/              # Shared TypeScript config bases
```

## Technology Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Language | TypeScript (strict mode) |
| API | Cloudflare Workers + Hono |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV |
| Frontend | React 18 + Vite + Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Validation | Zod |
| Routing (FE) | React Router |
