# Deployment Guide

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 11
- A [Cloudflare account](https://dash.cloudflare.com/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed as dev dependency)

---

## 1. Cloudflare Resource Setup

### Create D1 Database

```bash
npx wrangler d1 create sunplus-db
```

Note the `database_id` from the output.

### Create KV Namespace

```bash
npx wrangler kv namespace create TELEMETRY_KV
```

Note the `id` from the output.

### Update wrangler.jsonc

Replace the placeholder IDs in `apps/api/wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "sunplus-db",
      "database_id": "<your-actual-d1-database-id>"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "TELEMETRY_KV",
      "id": "<your-actual-kv-namespace-id>"
    }
  ]
}
```

### Set Secrets

```bash
npx wrangler secret put DEVICE_API_KEY
npx wrangler secret put ADMIN_API_KEY
```

---

## 2. Run Migrations

```bash
# Local (for development)
pnpm --filter api exec wrangler d1 migrations apply DB --local

# Remote (for production)
pnpm --filter api exec wrangler d1 migrations apply DB --remote
```

---

## 3. Deploy API Worker

```bash
pnpm --filter api exec wrangler deploy
```

This deploys the Hono worker with:
- D1 database binding
- KV namespace binding
- Cron trigger (`0 0 * * *` - daily at midnight UTC)
- Environment variables

The worker will be available at `https://sunplus-api.<your-subdomain>.workers.dev`.

---

## 4. Deploy Frontend

### Option A: Cloudflare Pages (Recommended)

```bash
pnpm --filter web build
npx wrangler pages deploy apps/web/dist --project-name sunplus-web
```

Or connect the repository to Cloudflare Pages for automatic deployments:
- Build command: `pnpm --filter web build`
- Output directory: `apps/web/dist`
- Root directory: `/`

Set the environment variable `VITE_API_URL` to your deployed worker URL.

### Option B: Any Static Host

```bash
pnpm --filter web build
```

Deploy the `apps/web/dist/` folder to any static hosting provider. Set `VITE_API_URL` at build time.

---

## 5. Configure Edge Devices

Each solar inverter must be configured with:
- **API endpoint**: `https://<worker-url>/api/v1/telemetry/ingest`
- **API key**: The `DEVICE_API_KEY` value
- **Payload format**:

```json
{
  "deviceId": "<registered-device-id>",
  "voltage": 380.5,
  "current": 12.4,
  "temperatureC": 42.1,
  "efficiencyPct": 96.8
}
```

Devices must be registered first via the Settings page or API before they can ingest telemetry.

---

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Create local env file
cp apps/api/.dev.vars.example apps/api/.dev.vars

# 3. Run local migrations
pnpm --filter api exec wrangler d1 migrations apply DB --local

# 4. Start both servers (API on :8787, Web on :3000)
pnpm dev
```

The Vite dev server proxies `/api` to `localhost:8787` automatically.

---

## Testing Telemetry Ingestion

```bash
curl -X POST http://localhost:8787/api/v1/telemetry/ingest \
  -H "Authorization: Bearer dev-device-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "solar-inv-001",
    "voltage": 380.5,
    "current": 12.4,
    "temperatureC": 42.1,
    "efficiencyPct": 96.8
  }'
```

---

## Monitoring & Observability

- **Worker logs**: Cloudflare Dashboard > Workers > sunplus-api > Logs
- **D1 queries**: Cloudflare Dashboard > D1 > sunplus-db
- **KV keys**: Cloudflare Dashboard > KV > TELEMETRY_KV
- **Cron executions**: Visible in worker logs at midnight UTC
