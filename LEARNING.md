# DreamAbroad CRM — Engineering Notes for Learning

A companion to the code: why we chose what we chose, what we considered and rejected, the bugs we hit and how we fixed them systemically. Written so a future you (or a system-design interviewer) can read it and follow the reasoning.

---

## Table of Contents

1. [Stack choices](#1-stack-choices)
2. [Data modeling decisions](#2-data-modeling-decisions)
3. [The AAA shell pattern](#3-the-aaa-shell-pattern)
4. [LINE integration: webhook semantics](#4-line-integration-webhook-semantics)
5. [The stage state machine](#5-the-stage-state-machine)
6. [Background jobs and scheduling](#6-background-jobs-and-scheduling)
7. [Configuration: env vs DB vs hardcoded](#7-configuration-env-vs-db-vs-hardcoded)
8. [Bugs we hit and their lessons](#8-bugs-we-hit-and-their-lessons)
9. [What we deliberately did NOT build](#9-what-we-deliberately-did-not-build)
10. [System design interview cheatsheet](#10-system-design-interview-cheatsheet-for-this-app)

---

## 1. Stack choices

### Database: PostgreSQL, not MongoDB

**Why Postgres won.** Look at our data: customers belong to one agent, customers have many messages, customers have many tags, stages are an enum. Every relationship is well-defined. The schema doesn't shape-shift.

**What MongoDB would have given us.** Schema flexibility — you can throw any document at it. But flexibility is only valuable when you actually need it. We don't. Forcing relational data into documents means either:
- Denormalizing (duplicate the agent name on every customer, then chase updates everywhere)
- Doing client-side joins (fetch customer, then separately fetch their messages, then their agent — N+1 problem)
- Using `$lookup` aggregations, which is basically SQL with worse syntax

**General lesson.** Pick your database by the shape of your data, not the hotness of the tech. Relational data → relational database. Document data (genuinely variable schema, like CMS content or analytics events) → document store.

### API: REST, not GraphQL

**Why REST.** Our endpoints are mostly CRUD against well-known resources. The LINE webhook is inherently REST (you can't ask LINE to send GraphQL POSTs). The frontend knows exactly what data each page needs — there's no client team asking for over-fetching freedom.

**Why not GraphQL.** GraphQL pays off when:
- You have many clients (web, mobile, third-party) needing different views of the same data
- The frontend evolves faster than the backend (the new view? client just adds the field)
- You're aggregating from many backends

We have one frontend, one backend, simple resources. GraphQL's costs (schema definition, resolver maintenance, N+1 mitigation via DataLoader, harder caching) buy us nothing. Reach for it when the symptoms appear, not preemptively.

### Framework: NestJS, not Express or Fastify

**Why NestJS.** It enforces structure (`module.ts` → `controller.ts` → `service.ts`). For a project that one person owns today and a small team might own tomorrow, opinionated structure prevents the "every file looks different" problem. Built-in DI, decorators, Swagger generation, validation pipe.

**Costs we accepted.** More lines per endpoint than raw Express. Heavier startup. Some magic.

**Alternative: Fastify.** Lighter, faster, but you write more glue code. For a CRM with ~30 endpoints, the framework's overhead is irrelevant; the structural payoff is real.

### ORM: Prisma, not raw SQL or TypeORM

**Why Prisma.** Schema-first (single source of truth in `schema.prisma`). Type-safe queries — if you rename a column, TypeScript errors immediately. `prisma db push` for dev makes iteration fast. `prisma studio` is a free DB GUI.

**Why not raw SQL.** Type safety. You either reinvent a query builder or accept stringly-typed bugs. For >10 tables with relations, raw SQL is a maintenance hole.

**Why not TypeORM.** Older API, more boilerplate, decorators-everywhere style. Prisma's schema file is more declarative and easier to review in PRs.

### Frontend: React + Vite, not Next.js

**Why Vite + plain React Router.** This is an internal CRM. No SEO concerns. No need for SSR. We want fastest dev experience (HMR) and a small bundle. Vite's dev server starts in 200ms vs Next's 3–10s.

**Alternative: Next.js.** Better if we needed server-side rendering, image optimization out of the box, or were planning to bolt on marketing pages. For an internal tool, it's overkill — and the file-system routing wouldn't help us.

### Styling: Tailwind, not CSS Modules / styled-components

**Why Tailwind.** Co-locates styling with markup, reads faster than jumping between files, zero runtime cost. The tag chip colors live in DB (per row) so we use inline styles for those — the rest is utility classes. Once you internalize the vocabulary, it's the fastest way to build polished UI.

**Costs.** Class lists get long. Learning curve at first. Hard for designers who don't code.

---

## 2. Data modeling decisions

### Table-driven enums (NOT hardcoded TypeScript enums)

Stages, tag types, and tag values all live in DB tables (`stage_definitions`, `tag_definitions`). Customer.stage is a foreign key, not a string union.

**Why.** The customer (DreamAbroad) wants to rename "Lead" to "Inquiry", or add a new stage "Interview" between Active and Applied, without filing a developer ticket. With hardcoded TS enums:
- Every change is a code deploy
- Migration of existing customers needs custom scripts
- Frontend dropdowns need to be updated in lockstep

With table-driven:
- Admin page adds a new row → done
- Frontend already loops over `stages.map(...)` — no code change

**Cost we pay.** One extra JOIN on every customer query. At our scale (4 stages, 30 tags, hundreds of customers) it's free. At 10M customers we'd cache the lookup tables.

**Pattern lesson.** Anything a non-technical user might reasonably want to change without a dev's help → put in DB.

### Soft delete on agents

`agents.is_active` boolean instead of `DELETE FROM agents WHERE id = ?`.

**Why.** Agents are referenced as FK by customers (`assignedAgentId`), messages (`agentId`), events (`agentId`). A hard delete either cascades (lose history) or fails (FK constraint). Neither is what the business means by "this agent left."

A soft delete preserves:
- The historical record of who replied to which customer
- The audit log integrity
- The ability to reactivate

**Cost.** Every query that lists agents has to filter `WHERE is_active = true` (or pass `?includeInactive=true`). One predicate, easy to forget. We solved it by making `?includeInactive=false` the default at the controller layer, so forgetting means hiding (safer than showing inactive everywhere).

### Audit log as a separate table (`customer_events`)

Every mutation logs to `customer_events` with `eventType`, `oldValue`, `newValue`, `agentId`, `createdAt`.

**Why a separate table** (vs adding `updated_by`, `updated_at` to each row):
- Per-row columns only tell you "who changed it last" — you lose the history
- A separate events table is append-only — perfect for "who archived this customer in March?"
- Reusable: events table can hold any event type without schema changes

**Alternative: event sourcing.** Treat events as the source of truth, derive current state by replay. Powerful but heavy. For a CRM that needs current-state queries 99% of the time, store both: derived state in `customers`, history in `customer_events`. We're not event-sourced, we're event-logged.

### "Honest" nullable fields

`customer.followedAt` is nullable. When we discover a customer via their first message (not via a real `follow` webhook event), we set it to `null` — not to "now."

**Why.** Faking timestamps to "now" because we don't know the truth is silently lying to future you. A null is loud — the UI says "Discovered via message — follow date unknown" and you instantly know not to trust that field for analytics.

**Pattern lesson.** When you don't know something, model it as unknown. Don't substitute defaults that look like real data.

---

## 3. The AAA shell pattern

We built the authentication/authorization scaffolding from day 1, even though there's no real login yet.

**Concrete pattern:**

```
api/src/auth/
├── auth.guard.ts           # Reads X-Agent-Id header (pass-through)
├── roles.guard.ts          # @Roles('admin') enforcement
├── current-agent.decorator.ts   # @CurrentAgent() param decorator
└── public.decorator.ts     # @Public() opts out of auth
```

**Now**: every controller writes `@CurrentAgent() agent`. AuthGuard reads `X-Agent-Id` and attaches the agent. No real login, but the pattern is in place.

**When real auth ships** (JWT, LINE LIFF, whatever):
- Replace `auth.guard.ts` internals — read from JWT cookie/header instead of `X-Agent-Id`
- Zero changes to any controller
- `@Roles('admin')` decorators already work

**Why this matters.** Adding auth to a codebase that wasn't built for it is a 2-week refactor. Building the shell first costs 30 minutes and makes the eventual swap a 1-hour task. Same pattern works for: logging, request tracing, multi-tenancy.

**General lesson.** Build the seams where you know change will come. Don't build the change itself if you don't need it yet.

---

## 4. LINE integration: webhook semantics

### What LINE actually guarantees

Almost nothing. LINE pushes events to your webhook with a few retries (if you enable "Webhook redelivery"), then gives up. There's **no queue between LINE and your server**. If your server is down, events are lost.

For a CRM with 15k followers, this is non-trivial. We mitigate at multiple layers:

1. **Deploy somewhere always-on** (not your laptop). This is the single biggest mitigation.
2. **Enable webhook redelivery** in the LINE console — buys ~3 retries over a few minutes.
3. **Signature verification** so we drop spoofed requests fast (return 401 quickly, don't 500).
4. **The user can still see all messages in the LINE OA Manager app** — so the only thing we lose is webhook-derived auto-population of customer rows, not the conversation itself.

### What we'd do for higher reliability

- **Queue in front of business logic.** Webhook handler does only: signature check + enqueue. A worker pulls from the queue and does the DB work. If the worker crashes, the queue retains the event. (BullMQ + Redis is the usual stack.)
- **Deduplicate at the queue level** using `message.id` as the dedup key — LINE retries can send the same event twice.
- **Multiple webhook receivers** behind a load balancer, each capable of accepting the event into the queue.

This is the textbook "split fast ingestion from slow processing" pattern. We didn't build it because at our scale a single direct path is fine. The pattern to remember is: **the entry point should be the cheapest, dumbest, most-available thing in the system.**

### Profile sync trade-off

When a new LINE user messages us, we call `client.getProfile(userId)` to get their name + picture. This is a second API call after the webhook.

**Risk.** If LINE rate-limits us, profile fetch fails. We log and proceed with a placeholder name. The customer still gets created — they just don't have a pretty avatar until they send another message or we backfill.

**Alternative we rejected.** Mandatory profile fetch (fail the webhook if profile call fails) → LINE retries → eventually succeeds. But this couples our webhook health to LINE's API health, and webhooks have strict time budgets.

**Lesson.** Graceful degradation > all-or-nothing.

---

## 5. The stage state machine

We have a deceptively simple-looking pipeline:

```
       (manual or cron 90d cold)
       ┌──────────────────────────┐
       ▼                          │
   ┌──────┐  ┌────────┐  ┌──────┐  ┌──────────┐
   │ Lead │→ │ Active │→ │Applied│→ │ Enrolled │
   └───┬──┘  └────────┘  └──────┘  └────┬─────┘
       │                                │
       ▼ (manual)                       ▼ (cron 90d post-enrolled)
   ┌──────────┐                    ┌────────┐
   │ Archived │                    │ Closed │
   │ (revives │                    │ (manual│
   │ on msg)  │                    │ only)  │
   └──────────┘                    └────────┘
```

The interesting part is the **two terminal states with different revive policies**:

| Stage | How you get there | What happens on new inbound? |
|-------|-------------------|-----------------------------|
| Archived | Lead went cold for 90d (auto) OR manual archive | Auto-revive to Lead |
| Closed | Enrolled for 90d (cron) OR manual close | Stays Closed |

**Why two states, not one.** A cold lead reaching back out is a *re-engagement opportunity* — you want them on the board to triage. An alumnus saying "just wanted to say thanks!" is *not* a new sales opportunity — keeping them surfaced as a Lead would create noise.

The business meaning of "out of pipeline" is different for the two cases. Modeling them as one state with a `reason` field would have made the revive logic awkward (`if reason === 'cold' && new_message → revive`). Two stages keep the rules clean.

**Cost.** Two cron passes instead of one. Slightly more UI text to explain. Worth it for clarity.

**Pattern lesson.** When a single bucket conceptually holds two different things with different rules, split the bucket. Don't add booleans/enums to a single bucket and branch in code — the model itself should encode the meaning.

---

## 6. Background jobs and scheduling

We use `@nestjs/schedule` for the daily archive cron, running inside the API process.

**Why in-process.** Simple. One container to deploy, monitor, debug. Cron jobs are just `@Cron()` decorators on a service method. No additional infrastructure.

**When this breaks.** Three scenarios force you out of the in-process model:

1. **Horizontal scaling.** Two API instances → the cron runs twice. Fix: use a distributed lock (Redis `SET NX EX`) so only one wins per tick. Or move the cron out.
2. **Long-running jobs.** A 5-minute archive blocks the event loop. Fix: workers + queue.
3. **Job retries / observability.** "Did the archive run yesterday?" — you need history. Fix: BullMQ-style queue with a UI.

**Pragmatic path.** Start in-process. When the first symptom hits, move that specific job to a worker. Don't over-engineer day-one.

### Cron design choice: why daily, not hourly

The archive moves customers across stages. Doing it hourly means a customer can flip the moment they cross the 90-day boundary, which is precise but useless — nobody is watching hourly. Daily at 03:00 (low-traffic) is:
- Predictable for ops
- Idempotent (running it twice = same result)
- Cheap enough that we don't care if it takes a few seconds

---

## 7. Configuration: env vs DB vs hardcoded

We have three tiers, with a clear precedence:

| Tier | Example | Lives in | When to change |
|------|---------|----------|----------------|
| Hardcoded | Idle severity 2h / 8h | TypeScript constants | Requires code review + deploy |
| Env var | `LINE_CHANNEL_SECRET` | `.env` / Railway vars | Requires restart but no deploy |
| DB setting | `enrolled_archive_days` | `settings` table | Live, no restart, via admin UI |

**The rule we follow:** **DB wins over env wins over hardcoded.**

```typescript
const days = await settings.getNumber('enrolled_archive_days', 'ENROLLED_ARCHIVE_DAYS', 90);
```

**Why three tiers, not just one.**

- **Secrets and per-environment config** (LINE token, DB URL): must be env. You don't put secrets in DB. You don't want prod and staging sharing a secret in code.
- **Business knobs that change quarterly** (archive threshold): DB. Admin should be able to tweak without an SRE.
- **Things that won't change** (the structure of an `idleSeverity` function, the names of webhook event types): hardcoded. Not everything is a config.

**Anti-pattern to avoid.** Making everything a DB setting "in case." You end up with hundreds of unused knobs and an admin UI that's impossible to scan. Only promote to DB when there's evidence of need.

---

## 8. Bugs we hit and their lessons

These are real bugs we shipped and fixed during this build. Each is a small case study.

### 8a. The toggle race

**Symptom.** User clicks a tag chip to disable it. UI doesn't update. Clicks again. Still nothing. Eventually clicks a different button → suddenly the first toggle "takes effect."

**Diagnosis path.** First hypothesis was a state-update bug in React. Second was browser HTTP caching (fixed it but didn't help). Real cause: the controller's DELETE method returned `void`. NestJS sends 200 with an **empty body**. Our generic `request()` did `return res.json()` which **throws on empty body**. The throw rejected the promise, so `await refetch()` in the toggle handler never ran. The customer state stayed stale until a different action (which returned a body, succeeded, refetched) pulled fresh data.

**Why it looked like a race.** Two compounding bugs masked each other:
1. The double-click closure issue (real, fixed with per-row pending state + awaited refetch)
2. The empty-body issue (revealed only after fix 1 stopped throwing earlier)

**Fixes applied:**
- `useFetch.refetch()` now returns `Promise<T | null>` so callers can `await` it
- Per-toggle `pendingId` state disables the button mid-flight
- `api/client.ts` reads response as `text()` first, only parses if non-empty
- (Bonus) `cache: 'no-store'` on all fetches to defang browser caching

**Lessons.**
1. **Async + closures + state updates are a notorious triangle of bugs.** When in doubt, await everything.
2. **An empty body is a value.** Your HTTP client must handle it. JSON parsing on empty body has been a CRT bug for 20 years.
3. **Multiple bugs hiding each other** is the worst kind of debugging. The fix for the first surfaces the second. Trust the symptoms, not the first plausible theory.

### 8b. The "follow date unknown" problem

**Symptom (not a bug, an honesty issue).** When a pre-existing follower (someone who added us before we enabled the webhook) sent us their first message, we created their customer row and set `followedAt = now()`. The UI said "LINE follower since today" — false. They followed years ago.

**Fix.** Pass the discovery source (`'follow'` event vs `'message'` event) to the creation logic. If discovered via message, `followedAt = null`. UI shows "Discovered via message — follow date unknown."

**Lesson.** When the system doesn't know something, model it as unknown. Future analytics queries built on a faked timestamp will silently give wrong answers; future queries built on `IS NULL` will be honest about the gap.

### 8c. Docker volume mount + HMR on Windows

**Symptom.** Edit a React file, save, browser doesn't update.

**Cause.** Vite watches the filesystem via inotify by default. inotify events don't propagate reliably from a Windows host into a Linux container (Docker Desktop WSL2 caveat).

**Fix.** `server.watch.usePolling: true` in `vite.config.ts`. Vite polls every 500ms instead of trusting filesystem events.

**Cost.** Slight CPU usage from polling. Worth it for the dev experience.

**Lesson.** When dev experience feels janky (slow reload, missed changes, weird flicker), check the watcher. inotify-via-Docker-on-Windows is a known source of pain.

### 8d. The hardcoded LINE channel ID

**Symptom.** "Open in LINE OA" button generates a URL pointing to channel `1234567890` — which doesn't exist.

**Cause.** Carried over from the static HTML mockup where `LINE_CHANNEL_ID` was a placeholder constant.

**Fix.** Changed to `https://chat.line.biz/` (just the landing page). Agent navigates manually.

**Lesson.** Mockup data is often more dangerous than no data because it looks plausible. Hunt for placeholders before shipping.

### 8e. The empty-body trap (generalized)

We saw this in a specific endpoint, but the lesson generalizes:

```typescript
// BAD — throws on 204 No Content, on empty 200, anywhere body is empty
return res.json();

// GOOD
const text = await res.text();
return text ? JSON.parse(text) : undefined;
```

Any HTTP client written for real APIs must handle this. It's the kind of bug that's invisible until a specific endpoint trips it.

---

## 9. What we deliberately did NOT build

The discipline of saying no is half of system design. Things we chose NOT to do, and why:

| Not built | Why not (yet) |
|-----------|---------------|
| **Real authentication** | Single-user pilot. Pass-through `X-Agent-Id` plus the agent switcher dropdown lets us test all roles. Real auth (JWT / LINE LIFF) gets built when we add a second human user. |
| **Outbound message send via LINE Push API** | Agents already reply natively in LINE OA Manager mobile (stickers, voice, all message types). Duplicating that in our web UI would be a worse experience. We track *that* they replied via "Mark as replied", not what they said. |
| **WebSocket / SSE for real-time updates** | Polling on page load is fine for a 5-agent team. Real-time matters when an agent and a manager are staring at the same screen and need to see live changes. Not our use case yet. |
| **Optimistic UI updates** | Considered for toggles. Decided that "await + disable" is simpler, just as fast feeling, and impossible to leave the UI in a wrong state. Optimistic UI requires rollback logic that's a common bug source. |
| **State management library (Redux/Zustand)** | We have React Context for two things (current agent, board filters) and `useFetch` for everything else. That's all we need. Adding a state library to "be safe" is YAGNI. |
| **Background job queue (BullMQ + Redis)** | The daily archive cron runs once a day inside the API process. No retries needed, no parallelism needed, no observability needed beyond logs. Add when we hit a real symptom. |
| **GraphQL** | Already covered. One client, simple resources. |
| **Microservices** | One developer, one repo, one deployment. Microservices solve org problems we don't have. |
| **Search engine (Elasticsearch / Meilisearch)** | <100 customers. `ILIKE '%term%'` in Postgres is instant. Revisit at 100k rows. |
| **CDN for static assets** | Single-region usage (Thai consultancy). Railway's edge is good enough. CDN matters when latency from far regions becomes painful. |

The pattern: **add complexity to address a symptom, not a hypothesis.**

---

## 10. System design interview cheatsheet for this app

If someone asked you to design a CRM for a LINE-based consultancy in an interview, here's the structured approach using this project as the example.

### 0. Clarify scope (always start here)

- **Scale.** "What's the user base?" → 5 agents, 15k followers but ~50 active leads at any time, <100 messages/day. This is small-to-medium scale; no need for sharding, replication tiers, multi-region.
- **Constraints.** "What integrations?" → LINE Messaging API (read-only inbound for v1).
- **Non-functional.** "What's the SLA?" → no formal SLA; missed webhooks for an hour is OK because LINE retries.

### 1. Data model

Walk through the entities:
- `customers` (FK to stage_definitions, FK to agent)
- `agents` (with role and `is_active`)
- `messages` (FK to customer, direction, body)
- `stage_definitions` and `tag_definitions` (table-driven enums)
- `customer_tags` (M:N join)
- `customer_events` (append-only audit log)
- `settings` (runtime config)

Justify each. Specifically defend table-driven enums (admin reconfigurability without deploy).

### 2. API style

REST, because: webhook integration, simple CRUD, single client, no over-fetching pain.

### 3. Auth design

- Phase 1: pass-through header (`X-Agent-Id`). Pattern in place for swap.
- Phase 2: JWT or LINE LIFF (in-LINE single-sign-on). LINE LIFF if all users have LINE; JWT + email/password otherwise.
- Role-based gating at decorator level (`@Roles('admin')`); UI-level hiding for UX, backend-level enforcement for security.

### 4. Webhook handling

- Public endpoint, signature-verified.
- Empty 200 on success (LINE expects this).
- For higher reliability: enqueue and process async. For our scale: direct DB write is fine.
- Auto-create unknown senders (graceful onboarding).

### 5. Background jobs

- Daily cron at 03:00 for two passes (enrolled→closed, cold lead→archived).
- In-process scheduler now. Move to worker process if it grows.

### 6. State machine

Two terminal stages (`archived` revives, `closed` is sticky) — model the *business semantics* in the schema, not in branching logic.

### 7. Scaling discussion (the part interviewers love)

Walk through how the system breaks as scale grows:

| Scale | What breaks | Fix |
|-------|-------------|-----|
| 1k customers | Nothing | — |
| 10k customers | Board fetches all customers — slow render | Server-side pagination + filter |
| 100k customers | DB queries slow on `customer_events` joins | Index on `(customer_id, created_at)`, archive old events to cold storage |
| 1M customers | Single DB instance under read pressure | Read replicas for dashboard queries; primary for writes |
| Multi-region | LINE webhook latency spikes for far users | Multiple webhook ingesters; queue for downstream |
| Many integrations beyond LINE | Webhook handler grows monolithic | Per-channel adapters (LINE, FB Messenger, WhatsApp) feeding a unified "Conversation" abstraction |

### 8. Failure modes & mitigation

- **API down**: LINE retries (with redelivery enabled), then drops. Customer's LINE messages aren't lost — only our log. Acceptable for v1.
- **DB down**: API rejects all requests with 5xx. LINE retries. Investigate quickly.
- **LINE down**: We don't notice (no inbound). Periodic test message could detect, but overkill at our scale.
- **Bad release**: Auto-rollback on healthcheck fail (Railway does this).

### 9. Observability

- Logs: Railway built-in.
- Errors: would add Sentry at >100 active users.
- Metrics: would add OpenTelemetry → Grafana when we have multiple services.

The pattern: don't add observability tools "just in case." Add them when you have a question you can't answer with logs.

---

## Closing thought

The cheapest skill in engineering is making things complicated. The expensive skill is keeping them simple while still solving the real problem. Every choice in this codebase tries to optimize for *one human owner now, possibly a small team later, definitely no users beyond a few hundred*. If those assumptions change, the code should change with them — but only then. Premature scaling, premature abstraction, and premature optimization all kill more projects than the things they were trying to prevent.

Build for what's true today, with the seams in place for tomorrow.
