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

## 5. Initial Setup

On first access, the dashboard UI will prompt you to create an admin password and a dashboard password. These are stored as PBKDF2-SHA256 hashes in the database. After initialization, use the dashboard password to log in and configure sources via the Settings page.

---

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Run local migrations
pnpm --filter api exec wrangler d1 migrations apply DB --local

# 3. Start both servers (API on :8787, Web on :3000)
pnpm dev
```

The Vite dev server proxies `/api` to `localhost:8787` automatically. On first load, the UI will show the setup form.

---

## Monitoring & Observability

- **Worker logs**: Cloudflare Dashboard > Workers > sunplus-api > Logs
- **D1 queries**: Cloudflare Dashboard > D1 > sunplus-db
- **KV keys**: Cloudflare Dashboard > KV > TELEMETRY_KV
- **Cron executions**: Visible in worker logs at midnight UTC
