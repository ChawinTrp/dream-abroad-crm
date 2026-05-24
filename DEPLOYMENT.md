# Deployment Guide — Railway

Goal: get the DreamAbroad CRM live on a stable public URL so LINE webhooks land 24/7 (not just while your laptop is on).

We use **Railway** because it bundles three things the CRM needs into one place:
- Docker-based services with auto-detected build
- Managed PostgreSQL
- Auto-provisioned HTTPS subdomains

Cost: free trial includes $5 credit. After that the full stack (api + web + db) is ~$5–10/month for low traffic.

---

## Architecture in production

```
Customer phone (LINE app)
        │
        ▼
   LINE servers
        │ POST /api/webhooks/line (with X-Line-Signature)
        ▼
┌──────────────────────────────────────────────────┐
│ Railway                                          │
│                                                  │
│  ┌─────────────────┐    ┌──────────────────┐    │
│  │  api service    │◄──►│  postgres        │    │
│  │  NestJS:3000    │    │  managed         │    │
│  │  dreamabroad-   │    │                  │    │
│  │  api.up.railway │    │                  │    │
│  └────────▲────────┘    └──────────────────┘    │
│           │ CORS-allowed                         │
│  ┌────────┴────────┐                             │
│  │  web service    │                             │
│  │  serve:5173     │                             │
│  │  dreamabroad.   │                             │
│  │  up.railway     │                             │
│  └─────────────────┘                             │
└──────────────────────────────────────────────────┘
        ▲
        │ HTTPS
   Agent's browser
```

Three Railway services in one project:
1. **postgres** — managed Postgres, no Dockerfile needed
2. **api** — built from `api/Dockerfile.prod`
3. **web** — built from `web/Dockerfile.prod`, knows the api URL at build time

---

## Pre-deployment code already done

These commits made the codebase deploy-ready:

| What | Where | Why |
|------|-------|-----|
| API URL from env at build time | `web/src/api/client.ts` | Frontend bundle calls the absolute api URL in prod, relative `/api` in dev |
| CORS from env (comma-separated) | `api/src/main.ts` | Backend must accept the web origin in prod (different domain) |
| Prod Dockerfile for API | `api/Dockerfile.prod` | Multi-stage, no dev deps in final image, runs `prisma db push` then `node dist/main` |
| Prod Dockerfile for web | `web/Dockerfile.prod` | Builds static `dist/`, serves via `serve -s` (SPA mode for react-router) |

---

## Step-by-step

### 1. Sign up and install
1. Go to https://railway.app → sign in with GitHub
2. Authorize Railway to read your `ChawinTrp/dream-abroad-crm` repo
3. (Optional) Install the CLI for log tailing: `npm i -g @railway/cli` → `railway login`

### 2. Create the project
1. Dashboard → **New Project** → **Empty Project**
2. Name it `dreamabroad-crm`

### 3. Add Postgres
1. Inside the project → **+ New** → **Database** → **Add PostgreSQL**
2. Railway creates a Postgres service named `Postgres`
3. Click it → **Variables** tab → copy the auto-generated `DATABASE_URL` value (looks like `postgresql://postgres:xxx@xxx.railway.internal:5432/railway`)

### 4. Deploy the API service
1. **+ New** → **GitHub Repo** → select `ChawinTrp/dream-abroad-crm`
2. Once created, click the service → **Settings** tab:
   - **Service Name:** `api`
   - **Root Directory:** `api`
   - **Builder:** Dockerfile
   - **Dockerfile Path:** `Dockerfile.prod`
   - **Start Command:** leave blank (Dockerfile CMD handles it)
3. **Variables** tab — add:
   ```
   DATABASE_URL          = (paste from Postgres service, but use ${{Postgres.DATABASE_URL}} reference for auto-updates)
   NODE_ENV              = production
   LINE_CHANNEL_SECRET   = (your real value)
   LINE_CHANNEL_ACCESS_TOKEN = (your real value)
   ENROLLED_ARCHIVE_DAYS = 90
   LEAD_COLD_DAYS        = 90
   WEB_ORIGIN            = (fill in step 6 once web service has a URL)
   ```
   The `${{Postgres.DATABASE_URL}}` syntax tells Railway "use this other service's variable" — it auto-updates if Postgres credentials rotate.
4. **Settings** → **Networking** → **Generate Domain** → you get something like `dreamabroad-api-production.up.railway.app`
5. Wait for first deploy. **Deployments** tab shows logs. Look for `Nest application successfully started`.
6. Visit `https://dreamabroad-api-production.up.railway.app/api/stages` — should return JSON.

### 5. Deploy the Web service
1. **+ New** → **GitHub Repo** → same repo
2. **Settings**:
   - **Service Name:** `web`
   - **Root Directory:** `web`
   - **Builder:** Dockerfile
   - **Dockerfile Path:** `Dockerfile.prod`
3. **Variables** → **Build Variables** (not runtime!):
   ```
   VITE_API_URL = https://dreamabroad-api-production.up.railway.app
   ```
   *Build variables* because Vite bakes them in at `npm run build` time. Runtime env vars are too late.
4. **Settings** → **Networking** → **Generate Domain** → e.g. `dreamabroad-production.up.railway.app`

### 6. Close the CORS loop
Back on the **api** service → **Variables** → set:
```
WEB_ORIGIN = https://dreamabroad-production.up.railway.app
```
Railway will redeploy api with the new CORS config. Without this, the browser blocks all api calls from the web URL.

### 7. Verify end-to-end
1. Open `https://dreamabroad-production.up.railway.app`
2. Switch to CT (Owner) in the agent dropdown
3. Click Admin → Members — should load with all 5 seeded agents
4. Open the Stage Board — empty (no real LINE customers yet)
5. Use Swagger at `https://dreamabroad-api-production.up.railway.app/api/docs` to test endpoints

### 8. Point LINE webhook to production
1. LINE Developers Console → your channel → Messaging API
2. **Webhook URL** = `https://dreamabroad-api-production.up.railway.app/api/webhooks/line`
3. Click **Verify** — should be ✅
4. **Webhook redelivery (Beta)** = **ON** (gives ~3 retries if your service hiccups)
5. Now you can shut down ngrok and your local machine — Railway keeps receiving events 24/7

### 9. Custom domain (optional)
Railway → web service → Settings → Networking → **Add Custom Domain** → enter `crm.dreamabroad.co` (or whatever). It'll show a CNAME target. Add the CNAME at your DNS provider. HTTPS is auto-provisioned via Let's Encrypt.

Then update `WEB_ORIGIN` on api accordingly.

---

## Operational notes

### Logs
- Railway dashboard → service → **Logs** tab streams in real time
- Or CLI: `railway logs --service api`

### Updating
Push to `main` → Railway auto-deploys. Zero-downtime by default (new container boots, healthcheck passes, old one drained).

### Database access
- Railway provides a public connection string under Postgres → Connect tab
- Use any Postgres GUI (TablePlus, DBeaver, Prisma Studio)
- Local Prisma Studio: paste the public URL into `.env`, run `cd api && npx prisma studio`

### Cost monitoring
- Railway dashboard → project → **Usage**
- Postgres is the biggest cost (storage + always-on)
- API + web sleep automatically if no traffic — but LINE webhooks keep them awake

### What if your free credit runs out?
- Upgrade to **Hobby plan** ($5/mo) which includes $5 usage and pay-as-you-go after
- Or migrate to Render/Fly (cheaper for hobby projects, slightly more setup)

---

## Common gotchas

| Symptom | Cause | Fix |
|---------|-------|-----|
| Web loads but every API call 404s | Frontend bundle still points at `/api` | Set `VITE_API_URL` as a **Build Variable**, not runtime. Trigger redeploy. |
| Web loads but API calls blocked by CORS | `WEB_ORIGIN` doesn't match the actual web URL | Set exact URL incl. `https://`, no trailing slash |
| LINE webhook 502 / 504 | API container crashed on boot — usually a Prisma migration issue | Check api logs. Likely `prisma db push` failed because `DATABASE_URL` wrong |
| LINE webhook 401 | Signature mismatch | `LINE_CHANNEL_SECRET` env var doesn't match the channel you're sending from |
| API service redeploys constantly | Healthcheck failing | Set Healthcheck Path = `/api/stages` in service settings (it's a public GET) |
| First request after idle is slow (~5s) | Cold start | Normal for hobby tier; LINE webhook retry handles this if enabled |

---

## When to revisit deployment choices

This deployment is right for **early production** (1 customer, <100 leads, single agent). Consider migrating when:

- **More than 1000 active customers** → move to a managed Postgres with backups (Neon, Supabase) outside Railway
- **Multiple regions of users** → put api behind Cloudflare or use a CDN for the web bundle
- **Need higher reliability** → split api into stateless app servers + queue for webhooks (BullMQ + Redis), so transient API outages don't drop events
- **Real authentication ships** → consider Auth0 / Clerk / LINE LIFF, not roll-your-own JWT
