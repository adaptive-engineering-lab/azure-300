# Feature Specification: Supabase Schema & Seed Question Bank

**Feature Branch**: `001-supabase-schema-and-seed`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "Supabase schema + seed 50 questions" (Phase 1 of AI300-Game-Spec.md §13)

## Clarifications

### Session 2026-05-11

- Q: How is a question's `id` assigned and used for idempotent seeding? → A: The seed source file supplies a deterministic UUID per item; the UUID is created at authoring time, lives in the JSON forever, and the seed command performs `UPSERT BY id`.
- Q: Where does the AI-author audit record live for `source: "ai-generated"` items? → A: Inline on the question row as two columns — `reviewer_id` and `reviewed_at` — both nullable in general but required (enforced by check constraint) when `source = 'ai-generated'`.
- Q: When is a learner's profile row created? → A: Automatically by a database trigger on `auth.users` insert. Defaults: empty `display_name`, `streak_days=0`, `last_active=null`, `level=1`. Application code never creates or checks for profile existence.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Curated Starter Bank Available to Learners (Priority: P1)

A learner opening the app for the first time can immediately study from a curated set of 50 AI-300 questions covering all five exam domains. The content is consistent, exam-aligned, and correctly tagged so any future game mode (flashcards, MCQ, product-ID) can pull items by domain, topic, type, and difficulty.

**Why this priority**: Nothing in the product works without content. Every downstream feature — flashcards, quizzes, progress tracking, spaced repetition — depends on a queryable, tagged question bank existing. This is the data foundation.

**Independent Test**: Run a read query that fetches all questions for any one domain; verify the result includes flashcards, MCQs, and product-ID items, that every item carries valid metadata (domain, topic, difficulty, source), and that the JSON payload validates against the per-type contract.

**Acceptance Scenarios**:

1. **Given** a freshly seeded environment, **When** a client queries for items in the "Networking" domain, **Then** the response includes at least one flashcard, one MCQ, and one product-ID entry, and each item carries `domain`, `topic`, `difficulty`, `type`, and `source` fields.
2. **Given** the seed bank, **When** an item is fetched by its ID, **Then** the type-specific payload (e.g., MCQ options + correct + explanation; flashcard front/back; product-ID category/description) is complete with no null required fields.
3. **Given** the seed bank, **When** every domain is queried in turn, **Then** all five AI-300 domains return at least one item per type.

---

### User Story 2 — Maintainer Can Seed and Update the Bank Reliably (Priority: P2)

A maintainer can author or update questions in a local source-of-truth file and run a single command to apply changes to the database. Re-running the command does not create duplicates. Items that fail schema validation are rejected with a clear error before any write happens, and the maintainer's initials and source (`bank` or `ai-generated`) are recorded.

**Why this priority**: The bank will grow continuously from 50 toward the 200-item Phase 4 target, much of it AI-drafted offline (per resolved decision). Without a repeatable, validated seed path, content quality drifts and duplicate or malformed rows poison every downstream mode.

**Independent Test**: Add a new valid item to the source file and run the seed command; verify the row appears in the database and is queryable. Then re-run the same command and verify no duplicate row is created. Finally, introduce a malformed item (missing required field) and verify the command rejects the whole batch with a specific error message.

**Acceptance Scenarios**:

1. **Given** a source file with 50 valid items, **When** the seed command runs against an empty database, **Then** exactly 50 rows are written and each row's metadata matches the source.
2. **Given** the same source file, **When** the seed command runs a second time, **Then** zero new rows are created and zero rows are mutated.
3. **Given** a source file containing one item missing a required field, **When** the seed command runs, **Then** the command exits non-zero with a message naming the offending item ID and field, and no partial writes are applied.
4. **Given** an updated item in the source file (same ID, changed content), **When** the seed command runs in update mode, **Then** the existing row is overwritten and an audit record (reviewer initials + timestamp) is captured.

---

### User Story 3 — Authenticated Learner Progress Persists Across Sessions and Devices (Priority: P3)

When an authenticated learner answers a question, rates a flashcard, or completes a session, their per-question progress (times seen, times correct, last rating, next review date) and session record are persisted, scoped to that learner only, and survive sign-out, reload, and switching devices.

**Why this priority**: Progress persistence is what makes spaced repetition and weak-area dashboards possible. It is one tier behind the bank itself: the bank can stand alone for a learner browsing anonymously (guest mode, handled in a later feature), but durable progress requires the schema to exist now so later features can write to it.

**Independent Test**: As an authenticated user, write a progress record for a known question ID; sign out, sign back in (or sign in on a different device), and verify the same record is readable. As a second authenticated user, verify the first user's progress rows are not visible.

**Acceptance Scenarios**:

1. **Given** an authenticated learner with no prior progress, **When** they answer one question and the result is recorded, **Then** querying their progress for that question returns the new row with correct `times_seen`, `times_correct`, `last_rating`, and `next_review`.
2. **Given** two authenticated learners A and B, **When** learner A queries any progress or session table, **Then** zero rows belonging to learner B are returned.
3. **Given** an authenticated learner with progress rows, **When** they sign in on a second device, **Then** all their existing progress is readable.

---

### Edge Cases

- **Empty domain**: A domain query that hits a domain with no seeded items returns an empty array, not an error.
- **Duplicate ID at seed time**: Two items with the same ID in the source file are rejected before any DB write.
- **Schema drift**: A future item type (not in the initial three) is rejected by validation until the contract is extended.
- **Unauthenticated read of progress tables**: Returns zero rows (RLS), never an error that leaks the table's existence.
- **AI-authored item without reviewer initials**: Rejected at seed time; every `source: "ai-generated"` row MUST carry an audit record.
- **Re-seeding after a partial failure**: A failed seed run leaves the database in its previous valid state — no half-written batches.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST store questions of three types — flashcard, MCQ, and product-ID — in a single queryable collection, with a shared metadata envelope (`id`, `type`, `domain`, `topic`, `difficulty`, `source`, `created_at`) and a type-specific payload.
- **FR-002**: The system MUST enforce that `domain` is one of the five fixed AI-300 domains: Identity & Governance, Storage, Compute, Networking, Monitoring. Any other value MUST be rejected.
- **FR-003**: The system MUST enforce that `type` is one of: `flashcard`, `mcq`, `product-id`. Any other value MUST be rejected.
- **FR-004**: The system MUST enforce that `source` is one of: `bank`, `ai-generated`. Every question row MUST carry two audit fields, `reviewer_id` and `reviewed_at`. Both fields are nullable in general but MUST be non-null whenever `source = 'ai-generated'` — this constraint MUST be enforced at the database level (not only at seed time).
- **FR-005**: The system MUST validate each type's payload against its contract before insert: MCQ requires `question`, `options` (exactly 4), `correct`, `explanation`; flashcard requires `front`, `back`; product-ID requires `service_name`, `category`, `description`.
- **FR-006**: The system MUST ship 50 seeded questions covering all five domains and all three types, with at least one item per (domain, type) pair.
- **FR-007**: The system MUST expose a maintainer-run seed process that is idempotent: re-running with an unchanged source file produces zero new rows and zero mutations. Idempotency is achieved by the seed file supplying each item's `id` as a deterministic UUID assigned at authoring time; the seed command performs upsert-by-id.
- **FR-008**: The seed process MUST reject the entire batch on any validation failure and surface the offending item ID and field; no partial writes are permitted.
- **FR-009**: The system MUST store per-user progress per question, including `times_seen`, `times_correct`, `last_rating` (one of `correct`, `almost`, `missed`), and `next_review` date.
- **FR-010**: The system MUST store per-user session records including mode, topic, score percentage, duration, and completion timestamp.
- **FR-011**: The system MUST enforce row-level access control so that each authenticated learner can read and write only their own progress and session rows. Cross-user reads MUST return zero rows.
- **FR-012**: Unauthenticated clients MUST be able to read the question bank but MUST NOT be able to read or write any progress or session row.
- **FR-013**: The system MUST support filtering questions by any combination of `domain`, `topic`, `type`, and `difficulty`.
- **FR-014**: The system MUST associate each authenticated learner with a profile record carrying `display_name`, `streak_days`, `last_active`, and `level`. The profile MUST be created automatically by a database trigger on authentication-identity insert, with defaults: empty `display_name`, `streak_days = 0`, `last_active = null`, `level = 1`. Application code MUST NOT be responsible for ensuring profile existence.
- **FR-015**: The system MUST capture a creation timestamp on every question row and an updated timestamp on every progress row.

### Key Entities

- **Question**: A single study item. Carries shared metadata (id, type, domain, topic, difficulty, source, created_at, reviewer_id, reviewed_at) and a type-specific JSON payload. The `id` is a UUID assigned at authoring time in the seed source file and is the natural key for idempotent seeding. `reviewer_id` and `reviewed_at` are required for AI-authored items and optional for bank-authored items. Source-of-truth for all game modes.
- **Profile**: A learner's account-level record, extending the authentication identity. Holds display name, streak, last-active date, and current level. Auto-created by a database trigger on authentication-identity insert — application code never provisions it.
- **UserProgress**: One row per (learner, question) pair. Tracks how many times the learner has seen the item, how often they answered correctly, their most recent self-rating, and the next-review date used by the spaced-repetition algorithm.
- **Session**: One row per completed study session. Captures the mode played, topic filter, score, duration, and timestamp — feeds the progress dashboard.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 50 seed items pass schema validation before being written; any malformed item halts the seed with a specific error.
- **SC-002**: Every one of the five AI-300 domains has at least one flashcard, one MCQ, and one product-ID item available in the bank (15 mandatory minimum coverage points, all green).
- **SC-003**: A learner browsing questions for any domain receives results perceived as instant (under one second from request to rendered content) on a typical mobile connection.
- **SC-004**: Re-running the seed against an unchanged source file produces zero database mutations, verified by row-count and updated-timestamp comparison.
- **SC-005**: In a two-user isolation audit, learner A reads zero rows belonging to learner B across all progress and session tables — verified by automated test.
- **SC-006**: A maintainer can add a new valid question to the source file and have it live in the database in under five minutes, including review and seed-run time.
- **SC-007**: The bank can be grown from 50 to 200 items without any schema change — only new rows.

## Assumptions

- The 50 initial items are distributed roughly evenly across domains (~10 per domain) and split across types in a ratio that biases toward MCQ (the most exam-like format), with flashcards next and product-ID least, matching the Phase 4 target ratio in §12 of the product spec.
- "Authenticated learner" means a user signed in via Supabase Auth (email magic link or Google, per §3.2). Guest-mode progress (local storage) is out of scope for this feature and is handled separately.
- The seed source-of-truth is checked into the repository as one or more JSON files; the seed command is run by the maintainer locally or in CI, not by end users.
- AI-authored items go through the offline authoring workflow defined in AI300-Game-Spec.md §7 before reaching the seed file; this feature only enforces that they arrive with the required audit metadata.
- Microsoft Azure service icon files (for product-ID items) are referenced by URL/path; their hosting and licensing review are tracked outside this feature (resolved decision #3).
- The five-domain set is treated as fixed for v1; adding a sixth domain would be a separate change with constitution review.
- This feature delivers schema, seed, and access-control rules only — no UI. A learner cannot "see" any of this until at least one game-mode feature is built on top of it.
