# Quickstart: Supabase Schema & Seed

Two paths: a **local stack** for development on a fresh checkout (recommended for first-timers and CI), and a **remote project** for working against a Supabase-hosted environment.

---

## Path A — Local stack (Docker)

### Prerequisites

- Node.js 20+ and `pnpm` (or `npm`/`yarn` — examples use pnpm).
- Docker Desktop running.
- Supabase CLI: `brew install supabase/tap/supabase`.

### 1. Bring up the local stack

```bash
supabase start
```

The CLI prints a local URL, anon key, and service-role key. Copy them into `tools/.env.local`:

```ini
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
```

Migrations under `supabase/migrations/` are applied automatically. To re-apply after edits:

```bash
supabase db reset
```

### 2. Install + validate

```bash
cd tools
pnpm install
pnpm seed:validate
```

Expected: `Validation complete: 50 items OK.`

### 3. Apply the seed

```bash
pnpm seed
```

Expected on a fresh database:

```
Seed complete: 50 inserted, 0 updated, 0 unchanged. Elapsed: <N>ms.
```

Run it again to confirm idempotency:

```bash
pnpm seed
```

Expected:

```
Seed complete: 0 inserted, 0 updated, 50 unchanged. Elapsed: <N>ms.
```

### 4. Smoke check from psql

```bash
supabase db psql
```

```sql
-- Domain coverage: every (domain, type) pair has at least one row
select domain, type, count(*) from public.questions group by 1, 2 order by 1, 2;

-- AI-author audit invariant works
insert into public.questions (id, type, domain, topic, difficulty, source, content, content_hash)
values (gen_random_uuid(), 'flashcard', 'storage', 'blob', 1, 'ai-generated',
        '{"front":"x","back":"y"}'::jsonb, 'fakehash');
-- Expected: ERROR — questions_ai_audit_chk
```

### 5. Run tests

```bash
pnpm test
```

What runs:

- **Contract** — schema validation, seed idempotency, duplicate-ID detection, partial-failure rollback, domain coverage, query-latency gate.
- **Integration** — anon read of `questions`, profile auto-provision trigger, RLS isolation between two users, anon-no-read of user tables.

Tests use the live local stack via the keys in `tools/.env.local`.

### 6. Tear down (when done)

```bash
supabase stop
```

---

## Path B — Remote Supabase project

Use this when you have a Supabase-hosted project (e.g., a `staging` or `dev` environment) and want to apply the schema there.

### Prerequisites

- Same as Path A but Docker is **not** required.
- A Supabase personal access token: `https://supabase.com/dashboard/account/tokens`.
- The project's database password from `Settings → Database`.

### 1. Authenticate the CLI

```bash
supabase login --token <your_pat_token>
```

### 2. Link the project

```bash
supabase link --project-ref <project-ref>
```

You can pass `-p <db-password>` to skip the prompt; otherwise the CLI asks interactively.

### 3. Push migrations

```bash
supabase db push --include-all
```

The CLI lists pending migrations and asks for confirmation. Type `Y`.

### 4. Fetch the keys

```bash
supabase projects api-keys --project-ref <project-ref>
```

Copy the `anon` and `service_role` keys into `tools/.env.local`:

```ini
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon JWT>
SUPABASE_SERVICE_ROLE_KEY=<service_role JWT>
```

`tools/.env.local` is gitignored. **Never commit it.** The `service_role` key bypasses RLS — treat it like a database password.

### 5. Seed and test

Same as Path A steps 2–5:

```bash
cd tools
pnpm install
pnpm seed:validate
pnpm seed
pnpm test
```

The tests will create and clean up disposable `test+*@ai300game.test` auth users via the admin API. They do not touch your real users.

---

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `pnpm seed` exits 20 | `tools/.env.local` is missing or incomplete | Re-create from `.env.example`; copy keys from `supabase status` or `supabase projects api-keys` |
| `seed` reports `N updated` on an unchanged re-run | `content_hash` is non-deterministic (e.g., key order changed in `canonicalize`) | Don't mutate `lib/canonicalize.ts` without re-running the suite — `seed-idempotency.test.ts` will catch it |
| RLS test sees user A's rows when querying as user B | RLS policy missing or `auth.uid()` not bound | Reapply `0007_user_tables_rls.sql`; verify with `supabase db diff` |
| `profiles` row missing after sign-up | Trigger lost `SECURITY DEFINER` or `search_path` | Re-apply `0008_profile_trigger.sql` |
| Seed exits 12 mid-batch | Service-role key wrong, network down, or a CHECK constraint failed | Re-check env vars; the transaction will have rolled back, so the DB is unchanged |
| Query-latency gate fails | Network distance to project region, or an index was dropped | Run from a developer machine on the same continent; check `pg_indexes` for `questions_domain_idx` |
