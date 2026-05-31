# Deployment Guide — Fly.io + Vercel + Neon (Free Tier)

Goal: get the DreamAbroad CRM live on a stable public URL so LINE webhooks land 24/7 (not just while your laptop is on), at **$0/mo** within free-tier limits.

---

## Why this combo

| Service | What it does | Free-tier reality | Why it won |
|---------|-------------|-------------------|-----------|
| **Neon** | Managed Postgres | 0.5 GB storage, always-on, **does NOT auto-pause** | Cron at 03:00 must run; Supabase's free tier pauses after 7 days of inactivity, Neon doesn't |
| **Fly.io** | API container | 3 shared-cpu-1x VMs (256 MB each), generous bandwidth | Truly free always-on container — set `auto_stop_machines = "off"` and LINE webhooks always have a server to hit |
| **Vercel** | Web (static SPA) | Generous free tier, global CDN, deploys from GitHub on push | Auto-detects Vite, instant deploys, fastest perceived load for agents |

**Total cost**: $0/mo at our scale (5 agents, ~50 active leads, low traffic).

### Why not the alternatives

- **Railway**: easiest UX, but only $5 trial credit. Then $5–10/mo. Rejected because free preferred.
- **Render** free tier: API **sleeps after 15 min idle**. LINE webhook after sleep takes ~30s to wake the server, often dropped. Dealbreaker.
- **GCP Cloud Run**: generous (2M req/mo free) but cold starts hurt webhooks; setup heavier (gcloud CLI, project config). Worth revisiting if scale demands it.
- **Cloudflare Workers**: would require rewriting NestJS to Workers runtime (no Node) — too much refactor.
- **Supabase Postgres** (vs Neon): same free-tier storage, but pauses after 7 days of inactivity. Bad for cron-driven workflows.

---

## Architecture in production

```
Customer phone (LINE app)
        │
        ▼
   LINE servers
        │ POST /api/webhooks/line (X-Line-Signature)
        ▼
┌────────────────────────────────────────────────────────┐
│  Fly.io                                                │
│  ┌────────────────────────┐                            │
│  │  api  (NestJS:3000)    │──┐                         │
│  │  dreamabroad-api.fly.dev│  │ DATABASE_URL           │
│  └─────────▲──────────────┘  │                         │
│            │                 ▼                         │
│            │       ┌────────────────────┐              │
│            │       │  Neon              │              │
│            │ CORS  │  dreamabroad.neon  │              │
│            │ allow │  Postgres          │              │
│            │       └────────────────────┘              │
└────────────┼───────────────────────────────────────────┘
             │
┌────────────┴───────────────────────────────────────────┐
│  Vercel                                                │
│  ┌────────────────────────┐                            │
│  │  web  (Vite static)    │                            │
│  │  dreamabroad.vercel.app│                            │
│  │  VITE_API_URL baked in │                            │
│  └────────────────────────┘                            │
└────────────────────────────────────────────────────────┘
             ▲
             │ HTTPS
        Agent's browser
```

Three independent services, each in its own provider, talking via HTTPS.

---

## Pre-deployment code already done

These commits made the codebase deploy-ready before this doc:

| What | Where | Why |
|------|-------|-----|
| Frontend API URL from build-time env | `web/src/api/client.ts` | Reads `import.meta.env.VITE_API_URL` in prod, falls back to relative `/api` in dev |
| Backend CORS from env | `api/src/main.ts` | Reads `WEB_ORIGIN` (comma-separated list); accepts the Vercel origin in prod |
| Prod Dockerfile for API | `api/Dockerfile.prod` | Multi-stage, no dev deps in runtime, runs `prisma db push` then `node dist/main` |
| Prod Dockerfile for web | `web/Dockerfile.prod` | Multi-stage, builds static `dist/`, serves via `serve -s` (SPA-mode for react-router) — used only if NOT deploying to Vercel |
| `api/fly.toml` | repo root of `api/` | Fly.io app config, internal port 3000, healthcheck on `/api/stages`, `auto_stop_machines = "off"` |
| `web/vercel.json` | repo root of `web/` | SPA rewrite so `/customers/:id` direct-nav doesn't 404 |

---

## Step-by-step

### 1. Create the Neon database

1. Sign up at https://console.neon.tech (GitHub OAuth fastest)
2. Click **Create project**:
   - Name: `dreamabroad`
   - Postgres version: 16
   - Region: pick closest to where Fly.io will run (e.g., `Asia Pacific (Singapore)` for Bangkok)
3. After provisioning, go to **Connection Details** in the dashboard
4. Copy the **pooled connection string**. Looks like:
   ```
   postgresql://dreamabroad_owner:XXX@ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech/dreamabroad?sslmode=require
   ```
5. Save it — we'll use it as `DATABASE_URL` in Fly.io secrets

### 2. Deploy the API to Fly.io

1. Install the CLI: `iwr https://fly.io/install.ps1 -useb | iex` (PowerShell) or `curl -L https://fly.io/install.sh | sh`
2. `fly auth signup` (or `fly auth login` if you have an account)
3. Add a payment method — required even on free tier (they verify you're human, won't charge unless you exceed limits)
4. From the repo root:
   ```
   cd api
   fly launch --no-deploy --copy-config
   ```
   - When prompted "Would you like to copy its configuration to the new app?" → **Yes** (uses our `fly.toml`)
   - Region: pick one near Singapore (`sin`) or Tokyo (`nrt`)
   - Postgres: **No** (we're using Neon)
   - Upstash Redis: **No**
   - Don't deploy yet
5. Set secrets (these become env vars in the container):
   ```
   fly secrets set DATABASE_URL="postgresql://...from-neon..."
   fly secrets set LINE_CHANNEL_SECRET="your_real_value"
   fly secrets set LINE_CHANNEL_ACCESS_TOKEN="your_real_value"
   fly secrets set ENROLLED_ARCHIVE_DAYS=90
   fly secrets set LEAD_COLD_DAYS=90
   fly secrets set NODE_ENV=production
   # WEB_ORIGIN set in step 4 after Vercel gives us a URL
   ```
6. Deploy:
   ```
   fly deploy
   ```
7. Wait ~3 minutes. Watch logs for `Nest application successfully started`.
8. Note the URL: `https://dreamabroad-api.fly.dev` (or whatever name Fly assigned). Test:
   ```
   curl https://dreamabroad-api.fly.dev/api/stages
   ```
   Should return JSON with 6 stages.

### 3. Deploy the web to Vercel

1. Go to https://vercel.com → sign in with GitHub
2. **Add New Project** → **Import** the `ChawinTrp/dream-abroad-crm` repo
3. Project settings:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: click "Edit" → set to `web`
   - **Build Command**: (default `npm run build`)
   - **Output Directory**: (default `dist`)
4. **Environment Variables**:
   - `VITE_API_URL` = `https://dreamabroad-api.fly.dev`
   *(Vite bakes this in at build time — no Vercel runtime env needed)*
5. **Deploy**. Wait ~1 minute.
6. Note the URL: `https://dream-abroad-crm.vercel.app` (or your assigned name)

### 4. Close the CORS loop

Back in Fly.io, tell the API to allow your Vercel origin:
```
fly secrets set WEB_ORIGIN=https://dream-abroad-crm.vercel.app
```
Fly auto-restarts the API. Wait ~30 seconds.

Test in the browser: open `https://dream-abroad-crm.vercel.app` → switch agent to CT (Owner) → Admin tab should load with all data. If you see "CORS error" in devtools, the `WEB_ORIGIN` doesn't match exactly — check for trailing slashes and `http://` vs `https://`.

### 5. Switch LINE webhook to production

1. LINE Developers Console → your channel → **Messaging API** tab
2. **Webhook URL** → paste:
   ```
   https://dreamabroad-api.fly.dev/api/webhooks/line
   ```
3. Click **Verify** — should return ✅
4. **Use webhook** = ON
5. **Webhook redelivery (Beta)** = **ON** (3 retries if API ever 5xx-s)
6. You can now shut down ngrok and stop your local Docker — LINE delivers to Fly 24/7

### 6. End-to-end test

1. Send "test message" to your LINE OA from your phone
2. Within ~2 seconds, open `https://dream-abroad-crm.vercel.app/board`
3. New customer appears in **Lead** column with your LINE display name + profile picture
4. Click the card → chat panel shows your message
5. Toggle "Mark as replied" → red banner clears

### 7. Custom domain (optional)

**For web (Vercel):**
- Vercel project → Settings → Domains → Add → `crm.dreamabroad.co`
- Vercel shows CNAME target → add at your DNS provider
- HTTPS auto-provisioned via Let's Encrypt
- Update `WEB_ORIGIN` on Fly to the new domain

**For api (Fly.io):**
- `fly certs add api.dreamabroad.co`
- Add CNAME → `dreamabroad-api.fly.dev`
- Update `VITE_API_URL` in Vercel env, redeploy web
- Update LINE webhook URL

---

## Operational notes

### Logs
- Fly API: `fly logs --app dreamabroad-api` (live tail) or dashboard → Monitoring
- Vercel web: dashboard → Deployments → click any → Runtime Logs
- Neon: dashboard → Monitoring (query insights, connection counts)

### Updating
- Push to `main` → Vercel auto-deploys web in ~30s
- API: `cd api && fly deploy` (no auto-deploy by default; can add GitHub Action if desired)

### Database access
- From local Prisma Studio: `cd api && DATABASE_URL="...neon-string..." npx prisma studio`
- From any Postgres GUI (TablePlus, DBeaver): use the Neon connection string directly

### Cost monitoring
- **Neon**: dashboard → Settings → Plan. You'll see compute hours used (1 month = 730 hours). Free tier = 191 hours/month for the active branch, but storage is what matters at our scale.
- **Fly.io**: dashboard → Billing. The 3 free shared-cpu-1x machines are tracked here. Watch for bandwidth (160 GB/month free).
- **Vercel**: dashboard → Usage. Free Hobby tier covers personal/non-commercial use. If the customer formally goes live as a business, technically you should upgrade to Pro ($20/mo) — but reality is most small CRMs run on Hobby without issue.

### Free-tier limits to watch
| Provider | Free-tier limit | What happens at limit |
|----------|----------------|----------------------|
| Neon | 0.5 GB storage | Read-only DB; need to upgrade |
| Neon | 191 compute hours/month | Branch suspends; reads work, writes don't |
| Fly.io | 3 shared-cpu-1x machines | Additional machines billed |
| Fly.io | 160 GB outbound/month | Bandwidth billed |
| Vercel | 100 GB bandwidth, 6000 build minutes | Soft limits; account warned |

For our scale (50 leads, low traffic), we'd hit ~5% of any of these in a month.

---

## Common gotchas

| Symptom | Cause | Fix |
|---------|-------|-----|
| Web loads but every API call 404 | `VITE_API_URL` not set or set as runtime var | Must be **build-time** variable in Vercel. Set, then trigger redeploy from dashboard. |
| Web loads but API calls blocked by CORS | `WEB_ORIGIN` doesn't match Vercel URL exactly | Use full `https://...vercel.app` with no trailing slash. Multiple domains? Comma-separate them. |
| LINE webhook 502 | Fly machine sleeping (auto_stop_machines on) | Check `fly.toml` — must have `auto_stop_machines = "off"` |
| LINE webhook 401 | Signature mismatch | `LINE_CHANNEL_SECRET` doesn't match the channel sending events. Re-check & re-set via `fly secrets set`. |
| `prisma db push` fails on first deploy | `DATABASE_URL` wrong (typo, wrong DB name) | Verify with `psql $DATABASE_URL -c '\dt'` locally first |
| First request after long idle slow | Cold start (Fly does NOT have aggressive cold starts but TCP handshake to Neon takes a second) | Acceptable; LINE webhook retry covers it |
| Fly deploy succeeds but `/api/stages` returns 502 | Healthcheck failing because endpoint path wrong | `fly.toml` healthcheck path must be `/api/stages` (we use prefixed routes) |
| Vercel build fails: `Cannot find module 'vite'` | Root directory not set to `web/` | Project Settings → General → Root Directory = `web` |

---

## When to revisit this deployment

This setup is right for **early production** (1 customer org, <500 leads, ≤5 agents). Consider migrating when:

| Scale change | What breaks | What to do |
|--------------|-------------|-----------|
| >5000 leads / >100 GB DB | Neon free tier storage cap | Upgrade Neon to Launch ($19/mo) or migrate to AWS RDS |
| Multiple LINE channels / >100 msg/sec | API throughput on single Fly machine | Add `fly scale count 3` (3 instances behind LB) + add a Redis queue for webhooks |
| Multiple regions of users | Latency spikes for users far from `sin` | Fly: `fly regions add nrt sjc` for multi-region |
| Compliance / data residency | Vercel CDN serves from many regions | Migrate web to CloudFront in a single region, or self-host |
| Outbound from CRM (Phase 5+) becomes critical | LINE Push API rate limits hit during burst | Add BullMQ + Upstash Redis as a send queue |
| Multiple paying customers (multi-tenant) | Shared infrastructure isolation | Separate DB per tenant or row-level security in Postgres |

---

## Alternatives appendix (for reference)

### Railway (single-service, simpler but paid)

Pros: monorepo deploy with one click, managed Postgres in same project, $5/mo flat.
Cons: not free after $5 trial credit. UX is by far the smoothest for first-time deployers.

If/when you want to switch, the same code works — just create three services in a Railway project (postgres + api + web) and use Railway's `${{Postgres.DATABASE_URL}}` reference syntax in the api service's env vars. Set `VITE_API_URL` as a build variable on the web service.

### Render (free tier with caveats)

Pros: very simple UI, free tier exists.
Cons: free API tier sleeps after 15 min idle → LINE webhook drops on cold start. Only acceptable for non-webhook apps.

### GCP Cloud Run + Cloud SQL

Pros: enterprise-grade, scales infinitely, cheapest at scale.
Cons: ~1 hr first-time setup (gcloud CLI, project, billing, IAM, VPC for Cloud SQL connection). Worth it if you're moving to multiple services or expect serious scale.

---

## Recap

Your live URLs after following this guide:
- **CRM**: `https://dream-abroad-crm.vercel.app` (or custom domain)
- **API**: `https://dreamabroad-api.fly.dev`
- **API docs**: `https://dreamabroad-api.fly.dev/api/docs`
- **LINE webhook target**: `https://dreamabroad-api.fly.dev/api/webhooks/line`

Total monthly cost: **$0** at current scale.

Total elapsed deployment time: **~25 minutes** from `fly launch` to first LINE message landing in Vercel.
