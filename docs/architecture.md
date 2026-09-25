# System Architecture

## Overview

SunPlus is a solar monitoring platform that polls metrics from third-party provider APIs, stores telemetry data, and serves it to dashboards. The API initiates outbound requests to configured providers on a schedule or on-demand, normalizes the results, and exposes them via authenticated endpoints.

## Data Flow

```
+-------------------+       Outbound HTTPS        +------------------------------+
| Provider APIs     | <-------------------------- | Cloudflare Worker (Hono API) |
| (SMA, Fronius...) |                             +------------------------------+
+-------------------+                                   |              |
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

### 1. Polling Layer

The API server periodically calls outbound to each configured provider's cloud monitoring API. Each provider adapter implements its own authentication and data fetching logic. Polling occurs both on-demand (when metrics endpoints are requested) and via a scheduled cron trigger.

### 2. Edge Worker Routing

The Cloudflare Worker uses Hono to handle:
- Password-based bearer token authentication (admin vs dashboard roles)
- Payload validation via Zod schemas
- IP-based rate limiting (token bucket algorithm)
- Route dispatching

### 3. Dual Storage Pattern

| Storage Engine | Primary Use Case | Access Pattern |
|---|---|---|
| **Cloudflare KV** | Latest metric snapshots, pre-aggregated charts | High-frequency write / Sub-1ms global read |
| **Cloudflare D1** | Historical telemetry, source registry, app settings, provider auth | Structured SQL queries, time-series aggregations |

### 4. Presentation Layer

The React SPA authenticates with a dashboard password stored in localStorage, then queries the public metrics endpoint for real-time cards and historical endpoints for analytics charts.

## Scheduled Cron Tasks

A daily cron trigger (`0 0 * * *` UTC midnight) executes:

1. **Poll Providers**: Fetches metrics from all active sources respecting per-source poll intervals
2. **Rollup**: Aggregates telemetry_logs older than 90 days into `daily_telemetry_summaries`
3. **Prune**: Deletes raw telemetry_logs older than 90 days
4. **Chart Pre-aggregation**: Stores 90-day daily summaries as JSON in KV (`chart:{source_id}:90d`)

## Authentication Model

On first access, the system requires initialization with an admin password and a dashboard password. Both are hashed using PBKDF2-SHA256 and stored in the `app_settings` table. All subsequent API requests require a Bearer token matching one of these passwords. Admin tokens grant access to source management; dashboard tokens grant read-only access to metrics.

## Monorepo Structure

```
/
├── apps/
│   ├── api/                   # Cloudflare Worker (Hono API)
│   │   ├── src/
│   │   │   ├── index.ts       # Fetch handler + scheduled handler
│   │   │   ├── routes/        # Setup, sources, metrics, public
│   │   │   ├── services/      # Sources, crypto, cron, providers
│   │   │   └── middleware/    # Auth, rate limiting
│   │   ├── migrations/        # D1 SQL migrations
│   │   └── wrangler.jsonc     # Cloudflare bindings
│   └── web/                   # Vite + React Dashboard
│       └── src/
│           ├── components/    # Layout, MetricCard, Charts, LoginModal
│           ├── contexts/      # Auth context
│           ├── pages/         # Dashboard, Analytics, Settings
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
