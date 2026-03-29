# Supabase setup (client wiring + historical phases)

> **Canonical DB workflow:** Prefer **CLI + `supabase link` / `supabase db push`** when the team adopts [`2026-03-29-supabase-migrations-cli-restore.md`](./2026-03-29-supabase-migrations-cli-restore.md). Otherwise, apply schema via **SQL Editor** and ordered `supabase/migrations/*.sql` per [`2026-03-28-supabase-hosted-no-cli.md`](./2026-03-28-supabase-hosted-no-cli.md). This document describes the original client/env implementation; if anything below conflicts with those plans on **migrations or rollout**, follow the workflow your team chose.

## Overview

Wire this Next.js app to Supabase **as a Postgres-backed API**: configuration, environment variables, and typed client factories from the browser and server to the Supabase **PostgREST** layer. **Schema** lives in [`supabase/migrations/`](../../supabase/migrations/) and is applied to hosted projects per the linked plan; the app persists job postings via [`lib/supabase/insert-job-posting.ts`](../../lib/supabase/insert-job-posting.ts) and [`lib/supabase/admin.ts`](../../lib/supabase/admin.ts) from server actions.

## Current State Analysis

- **Dependency**: `@supabase/supabase-js` and `@supabase/ssr` in `package.json`.
- **CLI config (reference only)**: [`supabase/config.toml`](../../supabase/config.toml) — `project_id`, local ports, Postgres **major_version = 17**. Teams **need not** run local Supabase; use it to align expectations with hosted Postgres version.
- **Migrations**: `public.job_postings` and `fraudulent` are defined in [`20260328140000_create_job_postings.sql`](../../supabase/migrations/20260328140000_create_job_postings.sql) and [`20260328150000_job_postings_fraudulent.sql`](../../supabase/migrations/20260328150000_job_postings_fraudulent.sql); run on hosted DB in filename order (see hosted workflow doc).
- **App code**: `lib/supabase/browser.ts`, `server.ts`, `admin.ts`; improvement flow inserts via [`app/improvement/actions.ts`](../../app/improvement/actions.ts). Existing REST config in [`lib/api/http.ts`](../../lib/api/http.ts) remains orthogonal.
- **Local CLI caveat**: If you use `supabase db reset` locally, resolve `[db.seed]` / `seed.sql` per config in `config.toml`—not required for hosted-only workflow.

## Desired End State

- **Hosted project**: Supabase project(s) with schema applied in migration order; URL and keys from **Project Settings → API** for dev/prod.
- **Environment**: `.env.example` / deployment secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only).
- **Code**: Browser + server + admin clients under `lib/supabase/`; server actions use service role for inserts where RLS has no anon policies.
- **Schema changes**: New files under `supabase/migrations/` (PR review), then run in **Dashboard → SQL Editor** on each environment (or use CLI if the team opts in—optional).
- **Verification**: `npm run build` passes; improvement submit creates a row when hosted DB matches migrations.

## What We're NOT Doing

- **Requiring** Supabase CLI, `supabase link`, `supabase db push`, or local Docker for the primary product workflow (see hosted plan).
- Supabase Auth flows (email/OAuth), Storage buckets, Edge Functions, or Realtime subscriptions—unless noted as optional future work.
- Replacing the existing Job Sentry REST client in [`lib/api/http.ts`](../../lib/api/http.ts); Supabase coexists alongside it.

## Implementation Approach

**Data path (mental model):**  
Next.js (browser or server) → `@supabase/supabase-js` → Supabase API (PostgREST) → PostgreSQL.

Use the **publishable (anon) key** in the browser only for operations that will eventually be protected by **RLS**. Use the **secret (service role) key** only in **server-only** code for break-glass or trusted server work; never expose it to the client or `NEXT_PUBLIC_*` vars.

Add **`@supabase/ssr`** for the recommended Next.js App Router pattern (`createBrowserClient` / `createServerClient` with cookie adapters). This stays valuable when you add Auth later and avoids rework even if the first queries are server-only.

**Apply schema** with [`2026-03-29-supabase-migrations-cli-restore.md`](./2026-03-29-supabase-migrations-cli-restore.md) (`supabase link`, `db push`) or the SQL Editor workflow in [`2026-03-28-supabase-hosted-no-cli.md`](./2026-03-28-supabase-hosted-no-cli.md); optional local iteration via `supabase start` and `supabase db reset`.

---

## Phase 1: Project, CLI, and environment

### Overview

Connect the repo to a **hosted** Supabase project and document required env vars. Local CLI/Docker is **optional**, not part of the default workflow.

### Changes Required

#### 1. Supabase dashboard (primary)

- Create a **Supabase project** (match Postgres **17** to [`supabase/config.toml`](../../supabase/config.toml) `[db] major_version` when the dashboard offers a choice).
- Apply migrations in **SQL Editor** in filename order per [`2026-03-28-supabase-hosted-no-cli.md`](./2026-03-28-supabase-hosted-no-cli.md).
- From **Project Settings → API**, copy:
  - Project URL
  - **Publishable** key (dashboard label; historically “anon” key)
  - **Secret** key (historically “service_role”) — **server only**

#### 2. Local development (optional — not required for hosted-only teams)

- Install [Supabase CLI](https://supabase.com/docs/guides/cli) only if you want a local stack.
- From repo root: `supabase start` to run the stack defined in [`supabase/config.toml`](../../supabase/config.toml).
- Run `supabase status` to print local URL and keys for `.env.local`.

#### 3. Link remote (only if using CLI against a remote project)

- `supabase login` then `supabase link --project-ref <ref>` from repo root.

#### 4. Environment variables

- Add to **`.env.local`** (and document in **`.env.example`**—create if missing; **never commit secrets**):

| Variable | Scope | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Anon/publishable key for browser + RLS-bound requests |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role key for trusted server operations |

Naming: if the dashboard still says “anon” / “service_role”, map them to the variables above consistently in code.

#### 5. Fix local seed config (no tables yet)

**File**: [`supabase/config.toml`](../../supabase/config.toml)  
**Changes**: Either set `[db.seed] enabled = false` until you add seeds, **or** add an empty/minimal `supabase/seed.sql` (e.g. a comment-only file if CLI accepts it—verify with `supabase db reset` once). Goal: **local reset does not fail** on a missing `./seed.sql`.

### Success Criteria

#### Automated Verification

- [x] `npm run build` succeeds after env vars are set locally (use placeholder keys only in CI if you add a check, or skip CI Supabase until secrets exist).
- [ ] If using local stack: `supabase status` returns healthy API and DB.

#### Manual Verification

- [ ] `.env.local` populated for dev; production env configured in the host (Vercel/etc.) with the same names.
- [ ] Optional: `supabase db reset` completes after seed fix (still with no app tables).

**Implementation note:** After env is set, ensure hosted DB has migrations applied (hosted workflow doc) before relying on inserts from the app.

---

## Phase 2: Install SSR helpers and add client modules

### Overview

Add `@supabase/ssr` and thin factories under `lib/supabase/` for browser vs server, following [Supabase Next.js (App Router) docs](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs).

### Changes Required

#### 1. Package

**File**: [`package.json`](../../package.json)  
**Changes**: Add dependency `@supabase/ssr` (version compatible with `@supabase/supabase-js` ^2.x).

#### 2. Browser client

**File**: `lib/supabase/browser.ts` (new)  
**Changes**:

- `"use client"` only if the module must only run on client; alternatively export a function called from client components without marking the whole module—follow the official quickstart pattern.
- Use `createBrowserClient` from `@supabase/ssr` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Throw a clear error at runtime if env vars are missing (dev-friendly).

#### 3. Server client

**File**: `lib/supabase/server.ts` (new)  
**Changes**:

- Import `server-only` at the top so this file cannot be pulled into client bundles.
- Use `createServerClient` with `cookies()` from `next/headers` per Supabase’s App Router recipe.
- Read the same public URL + publishable key for user-scoped PostgREST calls when Auth exists; for **phase 1** you may only export this for future use.

#### 4. Admin / service client (optional but useful for “database mainly” server jobs)

**File**: `lib/supabase/admin.ts` (new)  
**Changes**:

- `import "server-only"`.
- `createClient` from `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY` and `auth: { persistSession: false }` (or equivalent) for **trusted server-only** calls. **Do not** use for routine user-facing requests once RLS is the rule; prefer the server client + user JWT.

#### 5. Barrel (optional)

**File**: `lib/supabase/index.ts` — re-export only what callers need; avoid re-exporting admin from a generic barrel if it increases misuse.

### Success Criteria

#### Automated Verification

- [x] `npm run lint`
- [x] `npm run build` (ensures `server-only` boundaries and no accidental client import of admin/server module).

#### Manual Verification

- [ ] In a **Server Component** or **Route Handler**, call `createServerClient` and run a no-op or future query (e.g. after first migration, `from('...').select('count')`).
- [ ] In a **Client Component**, use the browser client only with the publishable key; confirm secret key is absent from client bundles (e.g. search build output or use Next.js analyzer if concerned).

---

## Phase 3: Type generation workflow (prep only)

### Overview

When tables exist, generated TypeScript types keep the client aligned with the database. **No generation run is required until you have schema.**

### Changes Required

- Document the command (do not commit generated file until you have schema). With CLI linked to the hosted project:  
  `npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts`  
  Or, if you run a local stack: `npx supabase gen types typescript --local > lib/supabase/database.types.ts`.  
  Hosted-only teams can install the CLI **only** for `gen types` against `--project-id`, or maintain hand-written types.
- Optionally add an `npm` script `supabase:types` for consistency.

### Success Criteria

#### Automated Verification

- [ ] Script runs successfully **after** the first migration (out of scope for this plan).

#### Manual Verification

- [ ] README or internal doc points implementers to regenerate types after migration changes.

---

## Testing Strategy

### Unit / integration

- No Supabase-specific unit tests are mandatory for env wiring; optional: mock `createClient` if you add query modules later.

### Manual

1. Set env vars → run `npm run dev` → load a page that uses server client (temporary test route can be removed after verification).
2. Confirm Network tab: browser calls go to `NEXT_PUBLIC_SUPABASE_URL` with `apikey` header using the publishable key only.

---

## Performance Considerations

- Prefer **server-side** data fetching for heavy or sensitive queries; use the browser client sparingly to limit key exposure surface and bundle size.
- When you add Auth, prefer **RLS** + publishable key on the client over wide use of the secret key on the server.

## Migration Notes

- **Canonical rollout:** [`2026-03-28-supabase-hosted-no-cli.md`](./2026-03-28-supabase-hosted-no-cli.md) — version SQL in `supabase/migrations/`, apply in **SQL Editor** on each hosted project in order. CLI `db push` / local Docker are optional alternatives, not assumptions.
- When you add tables, add a new timestamped migration file in the repo, then run it on each environment. Keep `major_version` aligned with production.
- Revisit `[db.seed]` and `schema_paths` in [`supabase/config.toml`](../../supabase/config.toml) only if you use local `supabase db reset`.

## References

- Supabase CLI config in repo: [`supabase/config.toml`](../../supabase/config.toml)
- Existing API base URL pattern: [`lib/api/http.ts`](../../lib/api/http.ts)
- Supabase Next.js guide: [Getting started — Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- Supabase local dev: [Local development](https://supabase.com/docs/guides/cli/local-development)
