# Implementation Plan: Supabase Schema & Seed Question Bank

**Branch**: `001-supabase-schema-and-seed` | **Date**: 2026-05-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-supabase-schema-and-seed/spec.md`

## Summary

Stand up the Supabase data layer that every later feature reads from and writes to. Deliverable is four tables (`questions`, `profiles`, `user_progress`, `sessions`), the constraints and triggers that enforce the spec's invariants (domain whitelist, AI-author audit, profile auto-provision, row-level security), and an idempotent maintainer-run seed command that loads a curated 50-item starter bank from JSON. No UI. Schema validation, RLS isolation, and seed idempotency are verified by automated tests before merge.

## Technical Context

**Language/Version**: SQL (Postgres 15+ via Supabase managed); TypeScript on Node 20 for seed and validation tooling
**Primary Dependencies**: `@supabase/supabase-js` (DB access), `ajv` (JSON Schema 2020-12 validation), `tsx` (run TS scripts directly), `vitest` (tests), `dotenv`
**Storage**: Supabase Postgres (single project; production + a local Supabase CLI stack for dev)
**Testing**: `vitest` for seed-script unit/contract tests; a smoke test script using the Supabase JS client (anon vs. authenticated, two test users) to verify RLS isolation against a real instance
**Target Platform**: Supabase managed Postgres for runtime; seed tooling runs on maintainer machine and in CI (GitHub Actions, Node 20)
**Project Type**: Web application (this feature is the data-layer slice — no frontend code yet)
**Performance Goals**: A single-domain question read returns under 1s end-to-end (SC-003) on a 4G connection; full 200-row seed completes under 5 minutes (SC-006)
**Constraints**: Seed must be idempotent (FR-007, upsert by id); RLS must isolate users with zero leakage (FR-011, SC-005); a CHECK constraint must enforce the AI-author audit invariant (FR-004); a database trigger must auto-create profiles on auth signup (FR-014)
**Scale/Scope**: 50 questions at launch, 200 by Phase 4; low single-digit thousands of learners projected for year one; per-question progress rows scale with users × questions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Status | Notes |
|---|---|---|---|
| I. Mobile-First UX | No | N/A | This feature has no UI surface. Mobile-first applies to the consuming features. |
| II. Domain-Aligned Content Integrity | Yes — core | Pass | A Postgres CHECK constraint pins the five domain values; `type`, `source`, and difficulty are similarly constrained. AI-authored items carry mandatory audit fields enforced by CHECK. |
| III. AI as Authoring Tool, Not Runtime | Yes | Pass | Seed loads pre-authored JSON. No Anthropic, no edge function, no outbound AI call from the runtime. AI-authored items reach the bank only via the offline workflow (§7 of product spec). |
| IV. Secrets Stay Server-Side | Yes | Pass | The Supabase service-role key is used only by the seed tooling (maintainer/CI environment) and is never shipped in any app bundle. RLS is enabled on every user-data table before insert privileges are granted. The future frontend will hold only the anon key. |
| V. Measurable Quality Gates | Yes | Pass | Spec SC-001 (100% schema validation) and SC-005 (zero cross-user leakage) become merge-blocking automated tests. No Lighthouse target applies (no UI). |

**Result**: No violations. Proceeding to Phase 0.

**Post-design re-check (after Phase 1)**: No new design choices conflict with any principle. The data-model and contracts artifacts re-state the same constraints in machine-checkable form.

## Project Structure

### Documentation (this feature)

```text
specs/001-supabase-schema-and-seed/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── flashcard.schema.json
│   ├── mcq.schema.json
│   ├── product-id.schema.json
│   └── seed-cli.md
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
supabase/
├── config.toml              # Supabase CLI project config (initialized in this feature)
├── migrations/
│   ├── 0001_questions.sql           # questions table + CHECK constraints + indexes
│   ├── 0002_profiles.sql            # profiles table referencing auth.users
│   ├── 0003_user_progress.sql       # user_progress table + indexes
│   ├── 0004_sessions.sql            # sessions table
│   ├── 0005_rls_policies.sql        # RLS policies for profiles/user_progress/sessions
│   └── 0006_profile_trigger.sql     # on_auth_user_created trigger
└── seed/
    └── content/
        ├── flashcards.json
        ├── mcq.json
        └── product-id.json

tools/
├── package.json
├── tsconfig.json
└── seed/
    ├── seed.ts              # Idempotent upsert-by-id loader; reads JSON, validates, writes
    ├── validate.ts          # CLI-only validation pass (no DB writes)
    └── lib/
        ├── load-content.ts
        ├── validate-content.ts  # AJV wrapper using contracts/*.schema.json
        └── upsert.ts

tests/
├── contract/
│   ├── schema-validation.test.ts    # Every seed file passes its schema; malformed items rejected
│   ├── seed-idempotency.test.ts     # Two runs produce identical row state
│   └── domain-coverage.test.ts      # Every (domain, type) pair represented
└── integration/
    ├── rls-isolation.test.ts        # Two users, zero leakage across user_progress/sessions
    ├── profile-trigger.test.ts      # Signing up a new auth user creates a profile row
    └── question-queries.test.ts     # Filter by domain/topic/type/difficulty works
```

**Structure Decision**: Single repository, no monorepo split. `supabase/` holds schema-as-code (migrations + seed content), `tools/` holds the Node-based seed runner that the maintainer and CI invoke, and `tests/` holds the contract and integration suites that protect FR-007, FR-011, and FR-014. No frontend code in this feature — that arrives with feature 002 onward.

## Complexity Tracking

> No constitution-check violations. Table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
