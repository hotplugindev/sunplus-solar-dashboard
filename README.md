# SunPlus Solar Dashboard

Solar monitoring platform built on Cloudflare's edge network. Polls metrics from third-party provider APIs, aggregates telemetry data, and renders interactive dashboards.

## Features

- **Edge-Native Architecture**: Cloudflare Workers + D1 + KV for sub-millisecond global reads
- **Provider Polling**: API initiates outbound requests to configured solar providers on schedule
- **Password Authentication**: Separate admin and dashboard passwords, hashed with PBKDF2-SHA256
- **First-Run Setup**: Guided initialization flow for password creation
- **Historical Analytics**: Time-series charts with 1h/6h/24h/7d/30d ranges
- **Source Management**: Add, configure, and manage multiple solar sources with per-provider auth
- **Public Metrics API**: Authenticated endpoint for external dashboards like Grafana
- **Dark Mode UI**: Tailwind CSS dashboard with responsive layout

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Language | TypeScript (strict mode) |
| API | Cloudflare Workers + Hono |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV |
| Frontend | React 18 + Vite + Tailwind CSS |
| Charts | Recharts |
| Validation | Zod |

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd sunplus-solar-dashboard
pnpm install

# Run migrations (local D1)
pnpm db:migrate

# Start dev servers (API :8787 + Web :3000)
pnpm dev
```

On first load, the UI will prompt you to create an admin password and a dashboard password.

## Project Structure

```
/
├── apps/
│   ├── api/              # Cloudflare Worker (Hono REST API)
│   │   ├── src/
│   │   │   ├── index.ts          # Fetch + scheduled handlers
│   │   │   ├── routes/           # Setup, sources, metrics, public
│   │   │   ├── services/         # Sources, crypto, cron, providers
│   │   │   └── middleware/       # Auth, rate limiting
│   │   ├── migrations/           # D1 SQL schema
│   │   └── wrangler.jsonc        # CF resource bindings
│   └── web/              # Vite + React SPA
│       └── src/
│           ├── components/       # Layout, MetricCard, Charts, LoginModal
│           ├── contexts/         # Auth context
│           ├── pages/            # Dashboard, Analytics, Settings
│           ├── hooks/            # Polling, data fetching
│           └── lib/              # API client, utilities
└── packages/
    ├── shared/           # Types, Zod schemas (used by api + web)
    └── tsconfig/         # Shared TS config bases
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/setup/status` | None | Check initialization state |
| `POST` | `/api/v1/setup/initialize` | None | Create admin and dashboard passwords |
| `POST` | `/api/v1/setup/login` | None | Authenticate with password |
| `GET` | `/api/v1/sources` | Any | List all sources |
| `POST` | `/api/v1/sources` | Admin | Create source with provider auth |
| `PATCH` | `/api/v1/sources/:id` | Admin | Update source |
| `DELETE` | `/api/v1/sources/:id` | Admin | Delete source |
| `PUT` | `/api/v1/sources/:id/auth` | Admin | Update provider auth |
| `GET` | `/api/v1/metrics` | Any | Poll providers and return fresh metrics |
| `GET` | `/api/v1/metrics/cached` | Any | Return cached metrics from KV |
| `GET` | `/api/v1/metrics/:id/history` | Any | Historical telemetry |
| `GET` | `/api/v1/public/metrics` | Dashboard | Public metrics for external dashboards |
| `GET` | `/health` | None | Health check |

See [docs/api-reference.md](./docs/api-reference.md) for full details.

## Configuration

### Cloudflare Bindings

Configure in `apps/api/wrangler.jsonc`:
- `DB`: D1 database binding
- `TELEMETRY_KV`: KV namespace binding

Passwords are set through the UI during first-run setup and stored as hashes in the database. No environment variables are needed for authentication.

## Documentation

- [Architecture](./docs/architecture.md) - System design and data flow
- [API Reference](./docs/api-reference.md) - Endpoint documentation
- [Database Schema](./docs/database.md) - D1 tables and lifecycle
- [Deployment](./docs/deployment.md) - Production deployment guide
- [Frontend](./docs/frontend.md) - React app structure

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | Lint all packages |
| `pnpm db:migrate` | Apply D1 migrations locally |
| `pnpm db:migrate:remote` | Apply D1 migrations to production |

## License

MIT
