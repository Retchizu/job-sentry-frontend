# Implementation: Supabase migrations and CLI restore (2026-03-29)

Plan: [`cursor/project/plan/2026-03-29-supabase-migrations-cli-restore.md`](../plan/2026-03-29-supabase-migrations-cli-restore.md)

## Summary

Restored **`supabase/migrations/*.sql`** (Path B — application contract) for `public.job_postings`, added **`supabase/seed.sql`** so `supabase db reset` can run seeding, fixed **`npm run supabase:types`** to use valid CLI flags (`gen types --local`), and added **`npm run supabase:types:linked`** for hosted projects after `supabase link`. Aligned onboarding docs so CLI + `db push` is the preferred option when this plan is adopted.

**Phase 3** (login, link, `migration list`, repair, `db push`) and **hosted-only Path A** (`db pull` when schema already exists on remote) require your Supabase account and project ref; they were not executed in this environment.

## Changes

| Area | Detail |
|------|--------|
| `supabase/seed.sql` | Comment-only placeholder; matches `[db.seed] sql_paths = ["./seed.sql"]`. |
| `supabase/migrations/20260328140000_create_job_postings.sql` | Creates `job_postings` with columns matching `insert-job-posting.ts`, `created_at`, RLS enabled. |
| `supabase/migrations/20260328150000_job_postings_fraudulent.sql` | Adds `fraudulent smallint` with `CHECK (0, 1)` and `DEFAULT 0`. |
| `package.json` | `supabase:types` → `supabase gen types --local -s public > lib/supabase/database.types.ts`; added `supabase:types:linked` for linked hosted projects. |
| `cursor/project/plan/2026-03-28-supabase-hosted-no-cli.md` | Top banner pointing CLI teams to this restore plan. |
| `cursor/project/plan/2026-03-28-supabase-client-to-database-setup.md` | Canonical workflow callout + implementation approach updated for CLI vs SQL Editor. |
| `cursor/project/plan/2026-03-29-supabase-migrations-cli-restore.md` | Automated checkboxes updated for completed phases. |

`supabase/config.toml` already had **`[db] major_version = 17`**; no edit required.

## Remote reconciliation (your steps)

1. If **`job_postings` already exists** on hosted (applied via SQL Editor): prefer **Path A** — `supabase link` then `supabase db pull` and handle the migration-history prompt; compare with `insert-job-posting.ts` instead of blindly **`db push`** (which would duplicate objects).
2. If the hosted DB is **empty** or you are fine applying these migrations: `supabase login`, `supabase link --project-ref <ref>`, `supabase migration list`, then `supabase db push` (optionally `--dry-run` first).

## Type generation

- **Local (Docker):** `npm run supabase:types` after `supabase start`.
- **Linked hosted:** `npm run supabase:types:linked` after `supabase link`.
- **One-off:** `npx supabase gen types --project-id <ref> -s public > lib/supabase/database.types.ts` (requires `supabase login`).

## Verification run (automated)

- `npx supabase --version` — **2.84.4**.
- `npm run build` — pass.
- `npm run lint` — pass.
- `npm run supabase:types` — not run to success here (`supabase start` was not running); same for `supabase:types:linked` (no linked project in this workspace).
