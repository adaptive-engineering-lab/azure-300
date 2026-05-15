# Contract: `seed` CLI

The seed tool is the only interface this feature exposes to maintainers. It is **not** invoked by end-user code.

## Invocation

```bash
# Validate only — no DB writes
pnpm seed:validate

# Validate + apply (idempotent upsert)
pnpm seed
```

Both commands read content from `supabase/seed/content/*.json` and JSON Schemas from `specs/001-supabase-schema-and-seed/contracts/*.schema.json`.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | yes | Target project URL (e.g., `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes for `seed` | Service-role key. Bypasses RLS to write `questions`. MUST NOT be present in any frontend env file. |
| `DRY_RUN` | optional | If `1`, runs full validation and prints the upsert plan but performs no writes. |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success — all items valid, upsert applied (or dry-run completed) |
| 10 | Validation failure — one or more items rejected. Stderr names each offending item by `id` and field. No DB writes occurred. |
| 11 | Duplicate `id` across input files. No DB writes occurred. |
| 12 | Database connection or transaction error. Run was rolled back. |
| 20 | Environment misconfiguration (missing variables). |

## Output contract on validation failure

Stderr, one item per failure, line-delimited:

```
[INVALID] id=<uuid> file=<path> field=<json-pointer> reason=<message>
```

Example:

```
[INVALID] id=8e1c4f72-... file=supabase/seed/content/mcq.json field=/content/correct reason=must be equal to one of the allowed values
```

After the last line, a one-line summary:

```
Validation failed: <N> of <M> items rejected. No database changes were made.
```

## Output contract on success

Stdout, one summary line:

```
Seed complete: <inserted> inserted, <updated> updated, <unchanged> unchanged. Elapsed: <ms>ms.
```

A successful no-op re-run produces `0 inserted, 0 updated, <M> unchanged`. This is the property `tests/contract/seed-idempotency.test.ts` asserts.

## Transactional guarantees

- The seed runs inside a single Postgres transaction. A validation failure aborts before any write; a DB error rolls the transaction back.
- Idempotency is achieved by `INSERT ... ON CONFLICT (id) DO UPDATE` with a content-hash short-circuit: if `excluded.content_hash = questions.content_hash`, the DO UPDATE branch is skipped so `updated_at` does not change.

## What the CLI deliberately does NOT do

- It does not create or run migrations. Schema changes go through `supabase/migrations/`.
- It does not generate IDs. Every item in the source JSON must already carry a UUID (see spec clarification Q1).
- It does not write to `profiles`, `user_progress`, or `sessions`.
- It does not call any AI API. AI-authored items arrive in the source JSON via the offline workflow described in AI300-Game-Spec.md §7.
