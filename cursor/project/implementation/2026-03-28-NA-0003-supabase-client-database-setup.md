# Implementation: Supabase client and database plumbing (2026-03-28)

Plan: [`cursor/project/plan/2026-03-28-supabase-client-to-database-setup.md`](../plan/2026-03-28-supabase-client-to-database-setup.md)

## Summary

Configured the repo for Supabase as Postgres/PostgREST plumbing without schema: fixed local seed so `db reset` will not fail on a missing file, documented env vars in `.env.example`, installed `@supabase/ssr`, and added `lib/supabase/` browser and server clients (cookie-aware App Router pattern) plus an optional admin (secret key) client. Added `npm run supabase:types` for when migrations exist.

## Changes

| Area | Detail |
|------|--------|
| `supabase/seed.sql` | Comment-only placeholder so `[db.seed] sql_paths = ["./seed.sql"]` resolves. |
| `.env.example` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only). |
| `.gitignore` | `!.env.example` so the example file can be committed under `.env*`. |
| `package.json` | Dependency `@supabase/ssr`; script `supabase:types` → `supabase gen types typescript --local > lib/supabase/database.types.ts`. |
| `lib/supabase/browser.ts` | `createBrowserSupabaseClient()` via `createBrowserClient` (`"use client"`). |
| `lib/supabase/server.ts` | `createServerSupabaseClient()` via `createServerClient` + `cookies()` from `next/headers` (`server-only`). |
| `lib/supabase/admin.ts` | `createAdminSupabaseClient()` via `@supabase/supabase-js` `createClient` + `SUPABASE_SERVICE_ROLE_KEY`, `auth.persistSession: false`. |
| `lib/supabase/index.ts` | Re-exports browser + server only (admin imported from `@/lib/supabase/admin` on purpose). |

## Type generation (after first migration)

- **Local:** `npm run supabase:types` (requires [Supabase CLI](https://supabase.com/docs/guides/cli) and `supabase start` or linked project context as appropriate).
- **Hosted:** `npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts` (with CLI logged in).

Do not commit `lib/supabase/database.types.ts` until a schema exists; wire `Database` generic into clients when you add that file.

## Env migration note

Set **`SUPABASE_SERVICE_ROLE_KEY`** to the dashboard service role key (server only) so `createAdminSupabaseClient()` can run. The publishable URL and key names match the plan.

## Verification run (automated)

- `npm run lint` — pass.
- `npm run build` — pass (Next.js 16.2.1).

Supabase CLI was not available in the dev environment used for this implementation; local `supabase status` / `supabase db reset` were not executed here.
