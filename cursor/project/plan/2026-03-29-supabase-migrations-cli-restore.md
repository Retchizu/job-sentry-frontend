# Restore Supabase migrations and adopt the CLI

## Overview

Bring **`supabase/`** back into the repo as the single source of truth for database schema, and standardize on the **Supabase CLI** for linking, inspecting migration history, pulling schema from hosted projects, pushing new migrations, and optional local stacks. This supersedes the “hosted-only, SQL Editor only” workflow in [`2026-03-28-supabase-hosted-no-cli.md`](./2026-03-28-supabase-hosted-no-cli.md) for teams that want CLI-driven migration management; the app code in [`lib/supabase/`](../../lib/supabase/) does not need to change for this work.

## Current State Analysis

- **Documented vs actual repo**: Plans such as [`2026-03-28-supabase-hosted-no-cli.md`](./2026-03-28-supabase-hosted-no-cli.md) describe `supabase/migrations/20260328140000_create_job_postings.sql` and `20260328150000_job_postings_fraudulent.sql`, but **those paths are not present** in the workspace (no `supabase/migrations/*.sql`, no `supabase/config.toml`, no `supabase/seed.sql`).
- **Application contract**: [`lib/supabase/insert-job-posting.ts`](../../lib/supabase/insert-job-posting.ts) inserts into `public.job_postings` with columns `job_title`, `job_desc`, `skills_desc`, `company_profile`, `rate_min`, `rate_max`, `currency`, `rate_type`, `fraudulent`, and expects a returned `id` (UUID). The table should include `created_at` (or equivalent) if the docs’ verification queries (`order by created_at`) are used.
- **Tooling**: [`package.json`](../../package.json) already includes devDependency `supabase` and script `supabase:types` (verify against `npx supabase gen types --help`; current CLI uses `supabase gen types --local`, which requires Docker when using the local stack). For hosted projects without Docker, prefer `supabase gen types --linked` after `supabase link`, or `supabase gen types --project-id <ref>`.

## Desired End State

- **`supabase/` exists in git** with at least:
  - `config.toml` (Postgres major version aligned with hosted project, typically **17** per prior docs).
  - `migrations/` containing one or more SQL files that reproduce **`public.job_postings`** in line with the insert path above.
  - `seed.sql` (can be comment-only) so [`supabase db reset`](https://supabase.com/docs/reference/cli/supabase-db-reset) does not fail if seeding is enabled in config.
- **Hosted project is linked** from the repo (`supabase link --project-ref <ref>`), and **`supabase migration list`** shows local and remote history **aligned** (or intentionally repaired).
- **Team workflow**: new schema changes via `supabase migration new <name>` → edit SQL → `supabase db push` (linked remote) and/or local `supabase start` + `supabase db reset` for integration testing.
- **Verification**: `npm run build` and `npm run lint` pass; improvement flow insert succeeds against hosted DB; optional `supabase db reset` succeeds locally.

### Key Discoveries

- **`supabase db pull`** (with project linked) creates a new file under `supabase/migrations/` from the remote schema; when the remote has **no** migration history rows yet, it can use `pg_dump`-style capture for your schemas (auth/storage often excluded by default—see CLI output and docs).
- **`supabase migration repair`** updates the **remote** migration history table when local files and remote history diverge; use it only with understanding of which migrations were actually applied on the database.
- **`supabase migration list`** compares LOCAL vs REMOTE and is the first diagnostic when “restore” or “out of sync” issues appear.

## What We're NOT Doing

- Replacing hosted Supabase with local-only development (local stack remains **optional**).
- Implementing Supabase Auth, Storage policies, or CI secrets wiring for `db push` in this plan (can be a follow-up).
- Changing Next.js insert logic unless schema reconciliation reveals a mismatch.

## Implementation Approach

1. **Initialize or restore `supabase/`** so the CLI has a valid `config.toml` and migrations directory.
2. **Choose one restoration path** based on whether the hosted database already has the real schema (most common after SQL Editor or lost files).
3. **Link, reconcile history, and push** so remote and git agree.
4. **Adjust npm scripts and docs** so types generation and onboarding match the CLI workflow.

---

## Phase 1: CLI prerequisites and `supabase/` skeleton

### Overview

Install the CLI (if not using `npx`), ensure Docker is available **only if** you will use `supabase start` / `db reset` locally, and create the `supabase/` directory structure.

### Changes Required

#### 1. Install Supabase CLI

- **Option A**: Use the repo’s devDependency: `npx supabase --version` from repo root.
- **Option B**: Install globally per [Supabase CLI guide](https://supabase.com/docs/guides/cli).

#### 2. Initialize project files

From repo root:

- If `supabase/config.toml` is missing: run `supabase init` (creates `supabase/config.toml` and empty `supabase/migrations` if needed).
- Set **`[db] major_version`** in `config.toml` to match your **hosted** project’s Postgres major version (prior internal docs assumed **17**).

#### 3. Seed file for local reset

**File**: `supabase/seed.sql`  
**Changes**: Add a minimal file (e.g. SQL comment only) if `[db.seed]` in `config.toml` points at `./seed.sql`, so `supabase db reset` does not fail on a missing path (matches the note in [`2026-03-28-NA-0003` implementation notes](../implementation/2026-03-28-NA-0003-supabase-client-database-setup.md)).

### Success Criteria

#### Automated Verification

- [x] `npx supabase --version` prints a version from repo root.
- [x] `supabase/config.toml` exists and `supabase/migrations/` exists (may be empty until Phase 2).

#### Manual Verification

- [ ] Hosted project’s Postgres major version matches `config.toml` (Dashboard → Database or project settings).

**Implementation note:** Pause after Phase 1 if `supabase init` would overwrite an existing config you intend to preserve; in that case, restore `config.toml` from version control or a backup instead of re-init.

---

## Phase 2: Restore migration SQL (pick one path)

### Overview

Recreate **`supabase/migrations/*.sql`** so it matches reality: either **from the live hosted database** (preferred when schema already exists) or **from the application contract** (greenfield or empty DB).

### Path A — Hosted DB already has `job_postings` (recommended when schema was applied via Dashboard or lost files)

1. **Do not** hand-run old SQL on production if objects already exist unless you have verified idempotency.
2. From repo root, after Phase 3 link (or do link first):  
   `supabase db pull`  
   Optionally pass a migration name: `supabase db pull descriptive_name`.
3. When prompted **“Update remote migration history table?”**, choose **Y** if you want the remote `schema_migrations` history to match the new file (typical when establishing CLI tracking for the first time). If unsure, stop and compare with `supabase migration list` before answering.
4. Review the generated SQL under `supabase/migrations/`: ensure `public.job_postings` columns align with [`insert-job-posting.ts`](../../lib/supabase/insert-job-posting.ts). If `db pull` bundled many schemas, consider narrowing with documented `--schema` flags if appropriate for your case.

### Path B — Hosted DB is empty or you want the original two-step history

1. Add two files (names can match historical convention or new timestamps):

   - **Migration 1**: `CREATE TABLE public.job_postings` with:
     - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` (or `uuid_generate_v4()` if `uuid-ossp` is used),
     - nullable text columns for structured fields, numeric types for `rate_min` / `rate_max`, text for `currency` and `rate_type`,
     - `created_at timestamptz NOT NULL DEFAULT now()` (recommended for ordering/debug),
     - **RLS** enabled and any comments/policies consistent with prior design (e.g. RLS on with no anon policies until later).
   - **Migration 2**: `ALTER TABLE ... ADD COLUMN fraudulent smallint NOT NULL` with `CHECK (fraudulent IN (0, 1))` (or equivalent), **or** include `fraudulent` in migration 1 if you prefer a single file.

2. Apply to hosted via **`supabase db push`** after `supabase link` (Phase 3), not by pasting into SQL Editor, so history stays consistent.

### Success Criteria

#### Automated Verification

- [x] At least one `.sql` file exists under `supabase/migrations/`.
- [x] `npm run build` passes (no app code change required for Phase 2 alone).

#### Manual Verification

- [ ] SQL matches what the app inserts and selects (`id`).

---

## Phase 3: Link project and reconcile migration history

### Overview

Connect the repo to the hosted Supabase project and fix **LOCAL vs REMOTE** drift using list/repair/push as needed.

### Changes Required

#### 1. Authenticate and link

```bash
supabase login
supabase link --project-ref <project-ref>
```

`<project-ref>` is the project reference id from the Supabase dashboard (URL/API settings).

#### 2. Inspect state

```bash
supabase migration list
```

Interpret columns **LOCAL** vs **REMOTE** per [migration repair docs](https://supabase.com/docs/reference/cli/supabase-migration-repair).

#### 3. Repair when histories disagree

Examples (adapt timestamps to your files):

- Mark remote as having applied a migration without re-running SQL:  
  `supabase migration repair <timestamp> --status applied`
- Remove a mistaken remote entry:  
  `supabase migration repair <timestamp> --status reverted`

Then re-run `supabase migration list` until the intended state is clear.

#### 4. Push pending local migrations

```bash
supabase db push
```

Use `supabase db push --dry-run` first if you want a preview (supported in current CLI; verify with `supabase db push --help`).

### Success Criteria

#### Automated Verification

- [ ] `supabase migration list` shows no unexpected gaps for the migrations you intend to track.

#### Manual Verification

- [ ] Dashboard **Table Editor** / SQL shows `job_postings` consistent with migrations.
- [ ] Improvement flow still inserts a row when using correct env vars ([`.env.example`](../../.env.example)).

**Implementation note:** Repair commands mutate **remote** migration metadata; coordinate with anyone else applying schema changes to the same project.

---

## Phase 4: Local development and npm scripts (optional but valuable)

### Overview

Use **local** Supabase for safe iteration and align `package.json` scripts with how the team actually works (local vs linked hosted).

### Changes Required

#### 1. Local stack

- `supabase start` — requires Docker.
- `supabase status` — copy API URL and keys into `.env.local` for local testing.
- `supabase db reset` — applies all migrations and runs `seed.sql`.

#### 2. Type generation

**File**: [`package.json`](../../package.json)  
**Changes**: Extend scripts so both workflows are one command each, for example:

- Local (Docker): `supabase gen types --local > lib/supabase/database.types.ts`
- Linked hosted: `supabase gen types --linked > lib/supabase/database.types.ts` (after `supabase link`)
- CI or one-off without link file: `supabase gen types --project-id <ref> -s public > lib/supabase/database.types.ts` (requires `supabase login`)

Align or replace the existing `supabase:types` script in [`package.json`](../../package.json) with the variant your team uses most often; confirm flags with `npx supabase gen types --help`.

Document which script to run in PR checklist or internal note.

### Success Criteria

#### Automated Verification

- [x] `npm run lint` passes.
- [ ] Chosen typegen command exits 0 when the target DB has the schema.

#### Manual Verification

- [ ] Optional: full insert test against local DB using `supabase status` keys.

---

## Phase 5: Documentation alignment

### Overview

Avoid contradictory onboarding: point migration workflow to this plan and CLI commands.

### Changes Required

#### 1. Canonical workflow pointer

**File**: [`2026-03-28-supabase-hosted-no-cli.md`](./2026-03-28-supabase-hosted-no-cli.md)  
**Changes**: Add a short top banner: **If the team uses the Supabase CLI for migrations, follow [`2026-03-29-supabase-migrations-cli-restore.md`](./2026-03-29-supabase-migrations-cli-restore.md) instead of manual SQL Editor rollouts.**

#### 2. Client setup plan

**File**: [`2026-03-28-supabase-client-to-database-setup.md`](./2026-03-28-supabase-client-to-database-setup.md)  
**Changes**: Update the “Canonical DB workflow” callout to mention **CLI + `db push`** as the preferred option when this restore plan is adopted.

### Success Criteria

#### Automated Verification

- [x] N/A (documentation-only).

#### Manual Verification

- [ ] A new contributor can run `supabase link`, `migration list`, and `db push` without relying on stale “no CLI” wording as the only path.

---

## Testing Strategy

### Manual Testing Steps

1. `supabase migration list` — LOCAL/REMOTE match after restore.
2. `supabase db push` (or `db pull` path) — no errors; table/columns visible in dashboard.
3. Run the app with `.env` pointing at that project; submit improvement flow; confirm row in `job_postings`.

### Edge Cases

- **Schema created only in SQL Editor, never tracked**: Use Path A (`db pull`) and carefully answer the migration history prompt, or use `migration repair` per CLI docs.
- **Duplicate migration timestamps**: Rename local files to unique timestamp prefixes before push.
- **Production safety**: Prefer `--dry-run` for push, test on a staging Supabase project first, and avoid destructive SQL without backups.

## Performance Considerations

None specific; CLI operations are administrative.

## Migration Notes

- **Squashing**: After a messy `db pull`, you may later use `supabase migration squash` (see CLI docs) to consolidate files—do this only with team agreement and a clean backup.
- **Branches / preview DBs**: Supabase branching (if enabled on your org) has its own caveats; keep migration files identical across environments and apply via `db push` per environment.

## References

- Supabase CLI: [Local development](https://supabase.com/docs/guides/cli/local-development)
- [`supabase db pull`](https://supabase.com/docs/reference/cli/supabase-db-pull), [`supabase db push`](https://supabase.com/docs/reference/cli/supabase-db-push), [`supabase migration repair`](https://supabase.com/docs/reference/cli/supabase-migration-repair)
- Prior hosted-only plan: [`2026-03-28-supabase-hosted-no-cli.md`](./2026-03-28-supabase-hosted-no-cli.md)
- Insert contract: [`lib/supabase/insert-job-posting.ts`](../../lib/supabase/insert-job-posting.ts)
