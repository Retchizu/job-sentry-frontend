# Supabase hosted-only workflow (no CLI, no local Docker)

> **If the team uses the Supabase CLI for migrations**, follow [`2026-03-29-supabase-migrations-cli-restore.md`](./2026-03-29-supabase-migrations-cli-restore.md) instead of manual SQL Editor rollouts.

## Overview

Run **one hosted Supabase project** for dev and production (or separate hosted projects per environment). Apply database changes **only through the Supabase Dashboard** (primarily **SQL Editor**), using the SQL files in this repo as the **canonical definition** of schema. **Do not** rely on `supabase start`, `supabase link`, or `supabase db push`—no Supabase CLI and no local Docker stack are required for this workflow.

The app already talks to hosted Supabase via `@supabase/supabase-js` and environment variables (`createAdminSupabaseClient` in [`lib/supabase/admin.ts`](../../lib/supabase/admin.ts), inserts in [`lib/supabase/insert-job-posting.ts`](../../lib/supabase/insert-job-posting.ts), called from [`app/improvement/actions.ts`](../../app/improvement/actions.ts)).

## Current State Analysis

- **Schema in git**: Ordered migrations under [`supabase/migrations/`](../../supabase/migrations/) define `public.job_postings` and the `fraudulent` column ([`20260328140000_create_job_postings.sql`](../../supabase/migrations/20260328140000_create_job_postings.sql), [`20260328150000_job_postings_fraudulent.sql`](../../supabase/migrations/20260328150000_job_postings_fraudulent.sql)).
- **Runtime**: Server actions use the **service role** client to insert into `job_postings`; RLS is enabled with no anon/authenticated policies yet (comments in migration match [`insert-job-posting.ts`](../../lib/supabase/insert-job-posting.ts)).
- **Env template**: [`.env.example`](../../.env.example) documents `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for a **hosted** project.
- **CLI config**: [`supabase/config.toml`](../../supabase/config.toml) documents local CLI/Docker defaults (e.g. Postgres **17**). For a no-CLI workflow it is **reference only**—use it to align expectations with the hosted project’s Postgres version, not to run containers.

## Desired End State

- Every environment the app uses has a **hosted** Supabase project with **schema applied in the same order** as `supabase/migrations/*.sql`.
- Developers configure `.env` / deployment secrets from **Project Settings → API** (URL, publishable/anon key, service role key) without installing the Supabase CLI.
- The team has a **repeatable, documented** way to roll out **new** SQL changes (new files in `supabase/migrations/`, then run in SQL Editor per environment).
- Verification: builds pass, hosted DB shows `job_postings`, and the improvement flow successfully inserts a row.

### Key Discoveries

- Inserts require the **`job_postings` table** and **`fraudulent` column** to exist on the hosted DB, or [`insertJobPostingFromPost`](../../lib/supabase/insert-job-posting.ts) will return a PostgREST/Postgres error to the user.
- [`createAdminSupabaseClient`](../../lib/supabase/admin.ts) **must** use the hosted project URL and **service role** key on the server only.

## What We're NOT Doing

- Installing or using **Supabase CLI** (`link`, `db push`, `migration up`, `start`, etc.).
- Running **Docker** or **local Supabase** for this product workflow.
- Automating schema apply through CI to Supabase (unless you add that later with explicit tooling—out of scope here).
- Supabase Auth, Storage, Edge Functions, or RLS policies for anon users (future work unless specified).

## Implementation Approach

Treat **`supabase/migrations/`** as version-controlled, human-reviewed SQL. For each hosted project (dev/staging/prod):

1. Open **Supabase Dashboard → SQL Editor**.
2. Run each migration file **in lexicographic / timestamp order** (same order as filenames), **once** per project.
3. Record outside the repo (runbook, ticket, or internal doc) **which migrations have been applied** to which project if you need to avoid accidental re-runs.

**First-time setup for a new hosted project**

1. Create the project in the dashboard (prefer Postgres major version consistent with [`supabase/config.toml`](../../supabase/config.toml) `[db] major_version`, currently **17**, if the dashboard offers a choice).
2. Run `20260328140000_create_job_postings.sql`, then `20260328150000_job_postings_fraudulent.sql` in SQL Editor.
3. Copy URL and keys into `.env` / hosting secrets per [`.env.example`](../../.env.example).

**Future schema changes**

1. Add a new `supabase/migrations/<timestamp>_<description>.sql` file in the repo (PR review).
2. After merge, run that script in SQL Editor on each hosted environment in order.

**Idempotency note:** Standard `CREATE TABLE` / `ALTER TABLE ... ADD COLUMN` scripts **fail** if re-run blindly. For production safety, either track applied migrations manually or evolve new scripts with defensive patterns (`IF NOT EXISTS` where appropriate) once you have objects in the wild.

---

## Phase 1: Hosted project and schema

### Overview

Ensure the hosted database matches the repo migrations so inserts succeed.

### Changes Required

#### 1. Dashboard (no repo file changes required)

- Create or select the hosted Supabase project.
- In **SQL Editor**, execute the full contents of:
  - [`supabase/migrations/20260328140000_create_job_postings.sql`](../../supabase/migrations/20260328140000_create_job_postings.sql)
  - [`supabase/migrations/20260328150000_job_postings_fraudulent.sql`](../../supabase/migrations/20260328150000_job_postings_fraudulent.sql)
- In **Table Editor**, confirm `public.job_postings` exists and columns match what [`insertJobPostingFromPost`](../../lib/supabase/insert-job-posting.ts) sends (`job_title`, `job_desc`, `skills_desc`, `company_profile`, `rate_*`, `currency`, `rate_type`, `fraudulent`).

#### 2. Environment configuration

**File**: deployment platform and local `.env` (not committed)

**Changes**: Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from **Project Settings → API** for that hosted project. See [`.env.example`](../../.env.example).

### Success Criteria

#### Automated Verification

- [x] `npm run build` passes from repo root.

#### Manual Verification

- [ ] SQL Editor runs both migration scripts without error on the target hosted project.
- [ ] Table `job_postings` is visible in the dashboard.
- [ ] Submitting the improvement flow in the app creates a row (check Table Editor or SQL `select * from job_postings order by created_at desc limit 5`).

**Implementation note:** After Phase 1 manual checks pass, treat the hosted DB as the source of truth for “schema is live”; git remains the source of truth for “what schema **should** be.”

---

## Phase 2: Team runbook (documentation hygiene)

### Overview

Align written docs with the no-CLI, hosted-only decision so new contributors do not assume `supabase start` or `db push`.

### Changes Required

#### 1. Obsolete or conflicting docs

**Files**: e.g. [`cursor/project/plan/2026-03-28-supabase-client-to-database-setup.md`](2026-03-28-supabase-client-to-database-setup.md) (states no migrations / CLI workflow in places—**conflicts** with current repo).

**Changes**: Add a short note at the top of that document pointing to **this plan** for schema and workflow, **or** update that plan’s “Current State” / “What We’re NOT Doing” sections to match reality (migrations exist; CLI optional). Prefer one canonical workflow doc to avoid contradiction.

#### 2. Optional README snippet (only if the repo already documents env setup in README)

**Changes**: If you maintain env instructions in README, add one sentence: schema is applied via **Supabase Dashboard SQL Editor** from `supabase/migrations/`, not via local Supabase. **Do not** add a new markdown file unless the team already uses README for onboarding.

### Success Criteria

#### Automated Verification

- [ ] N/A (documentation-only).

#### Manual Verification

- [ ] A new developer can follow this plan and `.env.example` without installing Supabase CLI or Docker.

---

## Testing Strategy

### Manual Testing Steps

1. With env vars set to the hosted project, load the improvement page and submit feedback with sample job fields.
2. Confirm a new UUID row appears in `job_postings` with expected `fraudulent` (0 or 1) from `labeled_scam` in [`saveImprovementFeedback`](../../app/improvement/actions.ts).

### Edge Cases

- **Missing table/column:** Expect a failed insert and error message surfaced from [`insertJobPostingFromPost`](../../lib/supabase/insert-job-posting.ts); fix by applying pending migration SQL on hosted DB.
- **Wrong key:** Using publishable key server-side for service-role-only operations will fail or be blocked by RLS once policies exist; keep service role server-only per [`admin.ts`](../../lib/supabase/admin.ts).

## Performance Considerations

None specific to hosted vs CLI; inserts are single-row from server actions.

## Migration Notes

- **Existing hosted DBs** that already have partial schema: compare live catalog to migration files before running; skip or hand-edit scripts if objects already exist.
- **Multiple environments:** Run the same ordered SQL on each hosted project; keep a simple checklist of migration filenames vs environment.

## References

- Migrations: [`supabase/migrations/20260328140000_create_job_postings.sql`](../../supabase/migrations/20260328140000_create_job_postings.sql), [`supabase/migrations/20260328150000_job_postings_fraudulent.sql`](../../supabase/migrations/20260328150000_job_postings_fraudulent.sql)
- Server insert path: [`lib/supabase/insert-job-posting.ts`](../../lib/supabase/insert-job-posting.ts) → [`app/improvement/actions.ts`](../../app/improvement/actions.ts)
- Env: [`.env.example`](../../.env.example)
