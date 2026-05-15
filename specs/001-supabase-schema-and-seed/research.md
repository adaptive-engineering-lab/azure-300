# Phase 0 Research: Supabase Schema & Seed

All `NEEDS CLARIFICATION` markers were resolved during `/speckit-clarify` (see [spec.md → Clarifications](./spec.md#clarifications)). This document captures the remaining best-practice decisions that shape the design without rising to spec-level questions.

---

## 1. Migration management

**Decision**: Use the Supabase CLI's file-based migration system (`supabase/migrations/NNNN_name.sql`), applied in production via `supabase db push` from CI and locally via `supabase db reset`.

**Rationale**:

- Migrations are plain SQL files in version control — reviewable in PRs, replayable on any environment, and the same artifact runs locally and in production.
- Matches the constitution's "schema-as-code" intent for Principle V.
- The Supabase CLI also drives the local Docker stack used by the integration tests, so dev/CI/prod converge on the same migration set.

**Alternatives considered**:

- **Apply DDL through the MCP `apply_migration` tool only**: convenient for ad-hoc work but bypasses the PR review trail. Rejected as the primary mechanism; reserved for one-off remote diagnostics.
- **Hand-rolled SQL execution from `tools/seed`**: collapses schema and content into one runner. Rejected — separating "schema shape" (versioned migrations) from "content rows" (idempotent seed) keeps each script's responsibility small.

---

## 2. Row-level security policy shape

**Decision**: One RLS policy per (table, command) pair, scoped on `auth.uid() = user_id`. `questions` has RLS enabled with a single `SELECT` policy granting access to `anon` and `authenticated`; writes to `questions` are not exposed through the API at all (only the service-role key, used by the seed tool, can mutate).

**Rationale**:

- The spec's FR-011 mandates per-user isolation on `user_progress` and `sessions`; FR-012 mandates public read on `questions` and no public write anywhere.
- Splitting policies by command (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) is the Supabase-recommended pattern — easier to audit one policy at a time than a single permissive policy with a complex predicate.

**Alternatives considered**:

- **Single FOR ALL policy per table**: shorter but conflates intent. Harder to grant a read-only role later.
- **Application-layer authorization in the frontend**: violates Principle IV (defense in depth must include the database). Rejected.

---

## 3. AI-author audit invariant: CHECK constraint vs. trigger

**Decision**: A table-level `CHECK` constraint on `questions`: `(source = 'ai-generated' AND reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL) OR (source = 'bank')`.

**Rationale**:

- The spec's clarification resolved that audit fields live on the row; enforcing the rule with a CHECK constraint is the cheapest, most declarative option Postgres offers.
- A trigger is overkill for a simple two-column conditional and adds an opaque execution path. CHECK is inspectable in `pg_constraint` and shows up in `\d+ questions`.

**Alternatives considered**:

- **BEFORE INSERT/UPDATE trigger**: required only if logic gets more complex (e.g., reviewer must exist in a `reviewers` table). Defer until that need arises.
- **Application-only validation in the seed script**: insufficient — a future MCP-driven manual insert could bypass it. The constitution's Principle II requires the database to be the integrity boundary.

---

## 4. Profile auto-provision

**Decision**: An `AFTER INSERT` trigger on `auth.users` that inserts a corresponding row into `public.profiles` with default values.

**Rationale**:

- Resolved in clarification Q3 as the authoritative pattern. It matches the canonical Supabase recipe (the official auth quickstart and SQL Editor template both ship this trigger).
- Guarantees referential integrity for `user_progress.user_id` and `sessions.user_id` foreign keys to `profiles.id` — no race where progress is written before a profile exists.

**Alternatives considered**:

- **Application-side upsert on first authenticated request**: requires every consumer to remember to call it. Rejected per clarification.
- **Materialized view over `auth.users`**: read-only, no place to hang `display_name`, `streak_days`, etc. Rejected.

---

## 5. Seed idempotency mechanism

**Decision**: `INSERT ... ON CONFLICT (id) DO UPDATE SET ...` using each item's authored UUID. The seed command computes a row-level content hash and skips the UPDATE branch when the inbound row hash matches the existing row's hash (so re-runs produce zero `updated_at` churn, satisfying SC-004 strictly).

**Rationale**:

- Resolved in clarification Q1: the JSON file owns the UUID. Upsert by primary key is the most direct expression of that.
- A content-hash short-circuit avoids `updated_at` drift on no-op re-runs, which keeps the "zero mutations on unchanged input" success criterion verifiable by timestamp comparison, not just row count.

**Alternatives considered**:

- **Truncate-and-reload**: destroys foreign-key references from `user_progress.question_id`. Rejected.
- **Compute diff in TypeScript, issue per-row UPDATEs only for changed rows**: more roundtrips, same outcome. The single ON CONFLICT statement is simpler.

---

## 6. Type-specific payload validation: JSON Schema vs. column-per-field

**Decision**: Store the type-specific payload in a `jsonb content` column (matching the product spec's data model). Validate against a JSON Schema 2020-12 file at seed time using AJV. The database also enforces minimal sanity checks on `content` via a CHECK that requires the expected top-level keys for each `type`.

**Rationale**:

- A unified `questions` table for three heterogeneous types is the product-spec choice; columns-per-field would balloon to a sparse 20+ column table. `jsonb` keeps the row tight and aligns with the spec's example payloads.
- Pushing structural validation to JSON Schema means contracts are authoritative, machine-readable, and shipped with the spec under `contracts/`.
- The thin database CHECK protects against the worst footgun (an MCQ row whose `content` lacks `options`) while keeping the heavy lifting in the seed validator where errors are most actionable.

**Alternatives considered**:

- **Separate `flashcards`, `mcq_questions`, `product_id_questions` tables**: stronger typing, three-way join to query across types. Rejected — the read patterns are "all questions for domain X, any type," which `jsonb` serves cheaply.
- **Database-only validation via deep `jsonb` CHECK predicates**: very verbose Postgres, hard to keep in sync with the contract file. Rejected.

---

## 7. Product-ID icon storage

**Decision**: Out of scope for this feature. The `content.icon_url` field on `product-id` rows is a string; whether it points at Supabase Storage, a CDN, or `/icons/*.svg` shipped with the frontend is a downstream call. The seed accepts any non-empty URL-like string and does not fetch.

**Rationale**:

- Resolved decision #3 makes "official Microsoft icons" the intent but flags a licensing review as a Phase 1 task — that review may invalidate the URL shape we'd pick today.
- Decoupling storage location from the schema means the icon-hosting decision can land independently without a migration.

**Alternatives considered**:

- **Wire up Supabase Storage in this feature**: premature; Storage adds policies, buckets, and CORS that have no consumer yet. Rejected.

---

## 8. Testing strategy: real DB vs. mocks

**Decision**: All contract and integration tests run against a real Postgres instance — the Supabase CLI's local Docker stack for developer machines and a dedicated `test` Supabase branch in CI. No mocking of Supabase client or SQL.

**Rationale**:

- RLS is the whole point of FR-011 and SC-005; a mocked client would happily lie about what `auth.uid()` returns. Only real Postgres proves the invariant.
- The Supabase CLI gives a fast (≈10s) bootable Postgres, so the cost of "real DB" tests is comparable to mocked ones.
- Aligns with the user's standing preference (per memory): integration tests must hit a real database, not mocks.

**Alternatives considered**:

- **Mock `@supabase/supabase-js` and assert query shape**: catches typos, misses the actual security property. Rejected.

---

## Open items deferred to later phases

- **Icon hosting decision** (deferred to feature 003-flashcards or a dedicated icons feature once licensing review completes).
- **Seed CI integration** (the `tools/seed/seed.ts` script will exist after this feature; wiring it into a GitHub Action that auto-runs on `main` merge is left to a later DevOps task).
- **Stripe / entitlements schema** for the Pro tier (resolved decision #2 puts this in Phase 4; not this feature).
