---
description: "Task list for Supabase schema + seed feature"
---

# Tasks: Supabase Schema & Seed Question Bank

**Input**: Design documents from `/specs/001-supabase-schema-and-seed/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — plan.md and spec.md (SC-001, SC-005) treat schema validation, idempotency, and RLS isolation as merge-blocking automated tests.

**Organization**: Tasks are grouped by user story. US1 (P1) delivers the MVP; US2 (P2) hardens the seed workflow; US3 (P3) adds the authenticated user-data layer.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different file, no dependency on incomplete tasks — safe to run in parallel.
- **[Story]**: Maps to spec.md user stories (US1, US2, US3).

## Path Conventions

Per plan.md → Project Structure (web app, data-layer slice):

- Schema-as-code: `supabase/migrations/`, `supabase/seed/content/`
- Tooling: `tools/seed/`, `tools/test-helpers/`
- Tests: `tests/contract/`, `tests/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Repo plumbing that every later phase depends on.

- [X] T001 Initialize Supabase CLI in repo (`supabase init`); commit `supabase/config.toml` and an empty `supabase/migrations/.gitkeep`
- [X] T002 Create Node tooling project at `tools/`: `tools/package.json` (deps `@supabase/supabase-js`, `ajv`, `ajv-formats`, `dotenv`, devDeps `typescript`, `tsx`, `vitest`, `@types/node`), `tools/tsconfig.json`, `tools/vitest.config.ts`
- [X] T003 [P] Configure linting and formatting at repo root: `.eslintrc.cjs`, `.prettierrc`, `.editorconfig`; add `lint` script to `tools/package.json` — **DONE 2026-05-16**: migrated to ESLint v9 flat config at `tools/eslint.config.js` (deps `@eslint/js`, `globals` added); deleted legacy `.eslintrc.cjs`. `pnpm lint` exits clean.
- [X] T004 [P] Create `tools/.env.example` listing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; add `.env`, `.env.local` to root `.gitignore`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared library and test infrastructure used by every user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 [P] Implement env-var loader at `tools/seed/lib/env.ts` — reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` via `dotenv`; throws with exit-code-20 semantics on missing values
- [X] T006 [P] Implement deterministic content hasher at `tools/seed/lib/canonicalize.ts` — sorts JSON keys, produces stable sha256 hex string; exported as `contentHash(obj)`
- [X] T007 [P] Implement Supabase client factory at `tools/test-helpers/clients.ts` — exports `anonClient()`, `serviceRoleClient()`, and `userClient(email, password)` for tests
- [X] T008 Implement test-user fixture helper at `tools/test-helpers/users.ts` — `createTestUser()` uses service-role admin API to create an auth user; `cleanupTestUsers()` deletes by email prefix `test+`; idempotent
- [X] T009 Wire `tools/vitest.config.ts` `globalSetup` to assert `SUPABASE_URL` resolves and a trivial `SELECT 1` succeeds; fail-fast if local Supabase stack is not running

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Curated Starter Bank Available to Learners (Priority: P1) 🎯 MVP

**Goal**: 50 curated, exam-aligned question rows exist in the database, every (domain, type) pair is covered, and any client (anon or authenticated) can filter and read them.

**Independent Test**: With a fresh DB and the seed applied, an anonymous Supabase client can query for any of the five domains and receive at least one flashcard, one MCQ, and one product-ID item with complete payloads. Verified by `tests/integration/question-queries.test.ts` + `tests/contract/domain-coverage.test.ts`.

### Tests for User Story 1 ⚠️

> Write these first; ensure they FAIL before T013–T021 land.

- [X] T010 [P] [US1] Contract test at `tests/contract/domain-coverage.test.ts` — after seed, every (domain ∈ 5, type ∈ 3) pair has ≥1 row; fails if any of the 15 cells is empty
- [X] T011 [P] [US1] Integration test at `tests/integration/question-queries.test.ts` — anon client filters by `domain`, `type`, `topic`, `difficulty` (FR-013) and gets non-empty results with complete payloads; one assertion per acceptance scenario in US1

### Implementation for User Story 1

- [X] T012 [P] [US1] Migration at `supabase/migrations/0001_questions.sql` — `public.questions` table with all CHECK constraints from data-model.md (`questions_type_chk`, `questions_domain_chk`, `questions_source_chk`, `questions_difficulty_chk`, `questions_ai_audit_chk`, `questions_content_shape_chk`) + indexes on `domain`, `type`, `(domain, type)`, `topic`
- [X] T013 [P] [US1] Migration at `supabase/migrations/0002_questions_rls.sql` — `ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY` + `questions_public_read` policy granting `SELECT` to `anon, authenticated`; no write policies
- [X] T014 [P] [US1] Author `supabase/seed/content/flashcards.json` — 15 flashcard items, ≥1 per domain, all with authored UUIDs, `source: "bank"`, valid against `contracts/flashcard.schema.json`. **DONE 2026-05-17**: 12 new items added covering mlops-infra (Workspace, Datastores, Compute), ml-lifecycle (AutoML, Pipelines), genaiops-infra (Foundry Setup, Managed Identities, Prompt Flow), genai-quality (Groundedness, Safety Evaluators), genai-optimization (RAG, Fine-tuning). All 15 validate.
- [X] T015 [P] [US1] Author `supabase/seed/content/mcq.json` — 25 MCQ items, ≥1 per domain, complete options/correct/explanation, valid against `contracts/mcq.schema.json`. **DONE 2026-05-17**: 25 items distributed 5/9/5/3/3 across mlops-infra / ml-lifecycle / genaiops-infra / genai-quality / genai-optimization. All validate.
- [X] T016 [P] [US1] Author `supabase/seed/content/code-review.json` — 10 code-review items, ≥1 per domain, valid against `contracts/code-review.schema.json`. **DONE 2026-05-17**: 10 items distributed 2/4/2/1/1; mix of `find-the-bug`, `fill-the-blank`, `what-does-this-do` sub-modes across python and yaml snippets. All validate.
- [X] T017 [US1] Implement minimal upsert at `tools/seed/lib/upsert.ts` — exports `upsertQuestions(rows)`; uses service-role client; performs `INSERT ... ON CONFLICT (id) DO UPDATE` (production-grade short-circuit lands in US2); writes `content_hash` from T006
- [X] T018 [US1] Implement content loader at `tools/seed/lib/load-content.ts` — reads the three JSON files, returns a flat array typed as `QuestionRow[]`
- [X] T019 [US1] Implement seed entry point at `tools/seed/seed.ts` — wires `load-content` → `upsert` → prints `Seed complete: X inserted, Y updated, Z unchanged. Elapsed: Nms.` (per `contracts/seed-cli.md`); depends on T006, T017, T018
- [X] T020 [US1] Add npm script `"seed": "tsx tools/seed/seed.ts"` to `tools/package.json`
- [X] T021 [US1] Run `supabase db reset && pnpm seed`; manually verify all 50 rows visible via `supabase db psql` and the two tests T010/T011 pass

**Checkpoint**: 50 items live and queryable; US1 success criteria SC-002 and SC-003 satisfied. MVP can be demoed.

---

## Phase 4: User Story 2 — Maintainer Can Seed and Update the Bank Reliably (Priority: P2)

**Goal**: The seed CLI matches the contract in `contracts/seed-cli.md`: it validates against JSON Schemas, rejects malformed batches atomically, detects duplicate IDs, supports `DRY_RUN`, runs inside a single transaction, and produces zero-`updated_at` no-op re-runs.

**Independent Test**: Run `pnpm seed` twice in a row against an unchanged source — second run reports `0 inserted, 0 updated, 50 unchanged` and `updated_at` columns are identical. Inject one malformed item — seed exits 10 with a specific `[INVALID]` line and the DB is unchanged. Verified by `tests/contract/{schema-validation,seed-idempotency,duplicate-id}.test.ts`.

### Tests for User Story 2 ⚠️

- [X] T022 [P] [US2] Contract test at `tests/contract/schema-validation.test.ts` — every committed seed item validates against its type's schema; a fixture with a missing required field is rejected with exit 10 and a `[INVALID]` line naming the field
- [X] T023 [P] [US2] Contract test at `tests/contract/seed-idempotency.test.ts` — runs seed twice; asserts second run reports `0 inserted, 0 updated`; asserts `MAX(updated_at)` of `questions` is unchanged across runs (SC-004)
- [X] T024 [P] [US2] Contract test at `tests/contract/duplicate-id.test.ts` — fixture with same UUID in two files exits 11; no rows written
- [X] T025 [P] [US2] Contract test at `tests/contract/partial-failure-rollback.test.ts` — starting from a freshly seeded DB (50 rows), stage a 5-item batch where item #3 violates `questions_domain_chk` (e.g., `domain: "not-a-domain"`); run the seed; assert exit code 12, assert all 50 original rows still present and unchanged (`MAX(updated_at)` unchanged), assert none of the 5 new items were written. Closes FR-008's "no partial writes" clause behaviorally.

### Implementation for User Story 2

- [X] T026 [P] [US2] Copy or symlink JSON Schemas from `specs/001-supabase-schema-and-seed/contracts/*.schema.json` into `tools/seed/contracts/` and load them at validator init
- [X] T027 [US2] Implement validator at `tools/seed/lib/validate-content.ts` — AJV with `ajv-formats`; one compiled validator per type; returns `{ valid: true } | { valid: false, errors: ValidationError[] }`; error shape includes `id`, `file`, `field` (JSON pointer), `reason`
- [X] T028 [US2] Implement `validate.ts` CLI at `tools/seed/validate.ts` — loads content, runs validator, prints `[INVALID]` lines and summary to stderr, exits 0 or 10 per `contracts/seed-cli.md`
- [X] T029 [US2] Add npm script `"seed:validate": "tsx tools/seed/validate.ts"` to `tools/package.json`
- [X] T030 [US2] Add duplicate-ID detection in `tools/seed/lib/load-content.ts` — set-based check across all files; exits 11 on duplicate per `contracts/seed-cli.md`
- [X] T031 [US2] Extend `tools/seed/lib/upsert.ts` with content-hash short-circuit — `ON CONFLICT (id) DO UPDATE ... WHERE questions.content_hash IS DISTINCT FROM excluded.content_hash`; depends on T017
- [X] T032 [US2] Extend `tools/seed/seed.ts`: wrap in single Postgres transaction (use Supabase RPC or a raw `pg` connection); env-validation step (exit 20); validation step before any write (exit 10 / 11); DB error rollback (exit 12); honor `DRY_RUN=1`
- [X] T033 [US2] Update `tools/seed/seed.ts` summary line to differentiate `inserted` / `updated` / `unchanged` counts (uses RETURNING + content-hash comparison)

**Checkpoint**: Seed CLI fully matches `contracts/seed-cli.md`. SC-001 and SC-004 verified by automated tests.

---

## Phase 5: User Story 3 — Authenticated Learner Progress Persists Across Sessions and Devices (Priority: P3)

**Goal**: `profiles`, `user_progress`, and `sessions` tables exist with RLS, a database trigger auto-creates a profile on `auth.users` insert, and cross-user reads return zero rows.

**Independent Test**: Create two test users via admin API; user A writes a `user_progress` row and a `sessions` row; user B's authenticated client queries both tables and gets zero rows belonging to A. Anonymous client gets zero rows on either table. New auth.users insert produces exactly one matching profile row. Verified by `tests/integration/{profile-trigger,rls-isolation,anon-no-read}.test.ts`.

### Tests for User Story 3 ⚠️

- [X] T034 [P] [US3] Integration test at `tests/integration/profile-trigger.test.ts` — admin-create a new auth user; immediately `SELECT * FROM profiles WHERE id = <new-uid>` and assert exactly one row exists with the expected defaults (`display_name=''`, `streak_days=0`, `last_active=NULL`, `level=1`)
- [X] T035 [P] [US3] Integration test at `tests/integration/rls-isolation.test.ts` — two users A and B; A inserts `user_progress` and `sessions` rows; B's authenticated client queries both tables → zero of A's rows visible (SC-005); A and B can each read their own rows
- [X] T036 [P] [US3] Integration test at `tests/integration/anon-no-read.test.ts` — anon client query against `user_progress` and `sessions` returns zero rows (no error leak); attempt to `INSERT` is rejected

### Implementation for User Story 3

- [X] T037 [P] [US3] Migration at `supabase/migrations/0003_profiles.sql` — `public.profiles` table referencing `auth.users(id) ON DELETE CASCADE` + `profiles_level_chk`
- [X] T038 [P] [US3] Migration at `supabase/migrations/0004_user_progress.sql` — `public.user_progress` with FKs to `profiles` and `questions`, `user_progress_rating_chk`, `user_progress_counts_chk`, `user_progress_unique`, and the `user_id, next_review` partial index
- [X] T039 [P] [US3] Migration at `supabase/migrations/0005_sessions.sql` — `public.sessions` with `sessions_mode_chk`, `sessions_score_chk`, and `(user_id, completed_at DESC)` index
- [X] T040 [US3] Migration at `supabase/migrations/0006_user_tables_rls.sql` — `ENABLE ROW LEVEL SECURITY` on `profiles`, `user_progress`, `sessions`; for each, create one policy per command (SELECT/INSERT/UPDATE/DELETE) scoped on `auth.uid() = <user_id col>`; `profiles` has SELECT + UPDATE only (no INSERT/DELETE — trigger and cascade handle those)
- [X] T041 [US3] Migration at `supabase/migrations/0007_profile_trigger.sql` — `public.handle_new_user()` function (SECURITY DEFINER, `search_path = public`) + `on_auth_user_created` AFTER INSERT trigger on `auth.users`; matches data-model.md exactly

**Checkpoint**: All three user stories independently functional. Spec SC-005 (zero cross-user leakage) verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation and CI wiring.

- [X] T042 [P] Run `quickstart.md` steps 1–5 end-to-end against a fresh `supabase db reset`; fix any drift between docs and reality — **DONE 2026-05-16**: `supabase start` + `supabase db reset` + `pnpm seed` + `pnpm test` round-trip exercised on this branch. 27 tests pass; the failing tests are all content-empty assertions (T014/T015/T016 gap).
- [X] T043 [P] Add `tools/README.md` linking to `specs/001-supabase-schema-and-seed/contracts/seed-cli.md` as the authoritative interface doc
- [X] T044 Add GitHub Actions workflow at `.github/workflows/data-layer.yml` — boots Supabase CLI stack, applies migrations, runs `pnpm seed:validate` + `pnpm seed` + `pnpm test`; required check on PRs touching `supabase/`, `tools/`, or `tests/`
- [X] T045 Configure CI to skip GitHub Actions for spec-only PRs (changes solely under `specs/`) to keep iteration cheap
- [X] T046 [P] Perf gate for SC-003 at `tests/contract/query-latency.test.ts` — anon client runs `SELECT * FROM questions WHERE domain = $1` for each of the 5 domains against the seeded local stack; assert p95 of 20 sampled runs per domain is under 1000 ms; fails the suite if exceeded

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** — no dependencies, run immediately
- **Phase 2 (Foundational)** — depends on Phase 1; BLOCKS all user stories
- **Phase 3 (US1)** — depends on Phase 2; delivers MVP
- **Phase 4 (US2)** — depends on Phase 2 + Phase 3 implementation tasks T017–T019 (US2 extends US1's seed pipeline); the *acceptance* is independent
- **Phase 5 (US3)** — depends on Phase 2 only; fully independent of US1/US2 (different tables, different code paths)
- **Phase 6 (Polish)** — depends on whichever stories are in scope for the release

### Within Each User Story

- Tests are listed first and should fail before implementation lands.
- Migrations (`.sql` files) can be authored in parallel — they only conflict on apply order, which the migration filenames pin.
- Within tooling: `lib/` modules before entry-point scripts; entry-point scripts before npm scripts.

### Parallel Opportunities

- All four T003 / T004 (Setup) tasks marked [P] can run in parallel.
- All three Foundational [P] tasks (T005, T006, T007) can run in parallel.
- Within US1: the three content-authoring tasks (T014, T015, T016) plus the two migrations (T012, T013) and the two tests (T010, T011) are all [P] — that's 7 tasks splittable across collaborators.
- Within US3: the three migrations (T037, T038, T039) and the three tests (T034, T035, T036) are [P].
- US3 has no code overlap with US1/US2, so a second developer can work US3 in parallel with US1+US2 once Foundational is done.

---

## Parallel Example: User Story 1

```bash
# Run in parallel after Foundational completes:
Task: "T010 Contract test domain-coverage.test.ts"
Task: "T011 Integration test question-queries.test.ts"
Task: "T012 Migration 0001_questions.sql"
Task: "T013 Migration 0002_questions_rls.sql"
Task: "T014 Author flashcards.json"
Task: "T015 Author mcq.json"
Task: "T016 Author code-review.json"

# Then sequentially:
Task: "T017 lib/upsert.ts"          # depends on Foundational T006
Task: "T018 lib/load-content.ts"
Task: "T019 seed.ts entry point"    # depends on T017 + T018
Task: "T020 add npm script"
Task: "T021 run seed end-to-end"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 + Phase 2 — repo, tooling, test helpers.
2. Phase 3 (US1) — schema, seed content, minimal loader.
3. **Stop. Demo.** A learner-facing read query returns the curated bank. No write-side correctness yet, but the foundation is real.

### Incremental Delivery

1. Setup + Foundational + US1 → **MVP**.
2. Add US2 → seed workflow is now bulletproof; content can grow safely.
3. Add US3 → authenticated progress persistence; ready for feature 002 (any UI mode) to consume.
4. Polish → CI gate + quickstart parity.

### Parallel Team Strategy

After Phase 2 completes, US1+US2 (developer A, sequential dependency) and US3 (developer B, independent) can proceed in parallel. They reconverge for Phase 6.

---

## Notes

- Test tasks come first within each story; assume vitest reports failures until the implementation tasks land.
- Idempotency is the single subtlest property in this feature — T023 is the canary; if it fails, T031 is the most likely culprit.
- The CHECK constraint `questions_ai_audit_chk` is the database-level guarantee for Principle II; no test explicitly covers it, but any seed item with `source: "ai-generated"` and missing audit fields will fail T022's validation pass and never reach the DB.
- All migrations are forward-only; no down-migrations. Schema rollback in this feature means reverting the migration files and running `supabase db reset` (acceptable while the project has no production data).
- Commit cadence: one commit per task, or one commit per logical group within a story. The `after_tasks` git extension hook will offer to commit when this command exits.

---

## Summary

| Phase | Story | Tasks | Parallel |
|---|---|---|---|
| 1 Setup | — | T001–T004 | 2 |
| 2 Foundational | — | T005–T009 | 3 |
| 3 US1 (P1, MVP) | Curated bank | T010–T021 | 7 |
| 4 US2 (P2) | Seed workflow | T022–T033 | 5 |
| 5 US3 (P3) | Auth progress | T034–T041 | 6 |
| 6 Polish | — | T042–T046 | 3 |
| **Total** | | **45 tasks** | |
