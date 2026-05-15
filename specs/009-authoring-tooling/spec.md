# Feature Specification: AI-Assisted Authoring Tooling

**Feature Branch**: `009-authoring-tooling`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "Authoring scripts under `tools/author/` (Claude-assisted, schema-validated) to grow the question bank toward 200" (Phase 3 of AI300-Game-Spec.md §13, expanded per §7)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Maintainer Drafts New Bank Items Via Claude With One Command (Priority: P1)

The maintainer runs a single command from the repository root, supplying a domain, a topic, a difficulty level, and a count. The command sends a structured prompt to the Claude API including the JSON Schema for the requested item type, the list of existing item IDs to avoid, and the domain/topic/difficulty context. Claude returns a batch of JSON items conforming to the schema. The tool validates each item against the schema locally and writes the valid ones to a draft file under `tools/author/drafts/` for human review. Invalid items are reported, not silently dropped.

**Why this priority**: The product spec sets a 200-item target by Phase 4. Hand-authoring all 150 remaining items is slow and inconsistent. Claude-assisted drafting is the documented mechanism for closing the gap. P1 because without this, the bank stays at 50 items and the spaced-repetition + dashboard features (007/008) feel thin.

**Independent Test**: Run `pnpm author draft --type=mcq --domain=storage --topic=blob-tiers --difficulty=2 --count=5`. Verify a `drafts/<date>-mcq-storage.json` file appears with at least one valid MCQ (some of the 5 may be rejected). Confirm the rejected items are reported on stderr with their schema errors and that the `existing-id` list passed to Claude included every UUID currently in the seed bank.

**Acceptance Scenarios**:

1. **Given** a maintainer in the repo root with API credentials configured, **When** they run the draft command with valid arguments, **Then** a draft file appears under `tools/author/drafts/` containing only schema-valid items and stderr summarizes how many were rejected.
2. **Given** Claude returns N items, **When** the validator runs, **Then** any item that fails its type's JSON Schema is excluded from the draft file and reported with its `field` and `reason`.
3. **Given** Claude returns an item whose `id` already exists in the seed bank, **When** the validator runs, **Then** that item is excluded and reported as a duplicate.

---

### User Story 2 — Reviewed Drafts Get Promoted Into the Seed Files (Priority: P1)

After human review, the maintainer runs a "promote" command pointing at one or more draft files. The command appends each reviewed item to the appropriate seed file (`flashcards.json`, `mcq.json`, or `product-id.json`), stamps each item with the maintainer's reviewer initials and the current timestamp, and confirms the result. The seed CLI from feature 001 can then upsert the new items idempotently.

**Why this priority**: Drafting without a promote path leaves items rotting under `tools/author/drafts/`. P1 because the loop is incomplete without this. It is also the gate where the `source: "ai-generated"` audit invariant (Principle II, feature 001 FR-004) becomes enforceable — every promoted item gets `reviewer_id` and `reviewed_at` filled in.

**Independent Test**: Take a draft file under `tools/author/drafts/`. Run `pnpm author promote drafts/<file>.json --reviewer=la`. Inspect the corresponding seed file and confirm the new items are appended with `source: "ai-generated"`, `reviewer_id: "la"`, and `reviewed_at` set to the current UTC timestamp. Run `pnpm seed` and confirm the new rows land in Supabase.

**Acceptance Scenarios**:

1. **Given** a valid draft file, **When** the maintainer runs promote with `--reviewer`, **Then** each item is appended to its type's seed file with `source: "ai-generated"`, the reviewer initials, and a current `reviewed_at`.
2. **Given** the maintainer runs promote without `--reviewer`, **When** the command starts, **Then** it errors out before any write, telling the maintainer that `--reviewer` is required.
3. **Given** an item in the draft file lacks a required schema field after manual edits, **When** promote runs, **Then** the whole promote operation aborts before any write and reports the offending item.
4. **Given** a draft has been promoted, **When** the maintainer runs the seed command from feature 001, **Then** the new items are upserted into the bank and the bank size grows by the promoted count.

---

### User Story 3 — Targeted Rewrites for Flagged Explanations (Priority: P2)

When the learner-facing app surfaces an explanation that learners flag as unclear (a future feedback channel; not implemented yet), the maintainer can run a "rewrite-explanation" command pointing at one or more existing item IDs. The command fetches the current explanation, asks Claude to rewrite it at a specified clarity target, and writes the proposed rewrites into a draft file for human review. Once reviewed, the same `promote` command from US2 updates the seed file in place.

**Why this priority**: Drafting new items (US1) handles growth; this story handles quality. P2 because quality improvements are deferred until the feedback channel exists; the architecture is in place but the workflow is dormant.

**Independent Test**: Take an item id from the bank. Run `pnpm author rewrite-explanation <id> --tone=concise`. Verify a draft file with the proposed rewrite appears, the original `id` is preserved, and the only field changed is `content.explanation`.

**Acceptance Scenarios**:

1. **Given** a valid item id and a tone argument, **When** the maintainer runs the rewrite command, **Then** a draft file appears containing the same item with only `content.explanation` changed and the other fields unmodified.
2. **Given** the maintainer promotes the rewrite, **When** the seed file is inspected, **Then** the original `id` row is updated in place; `reviewer_id` and `reviewed_at` reflect the rewrite review.

---

### Edge Cases

- **Anthropic API rate limit or outage**: the command exits non-zero with a clear retryable error; no partial draft is written.
- **A draft Claude returned contains an `id` that collides with one in another open draft file**: the second draft's collision is rejected at promote time, not at draft time, since both files are pending review.
- **Maintainer runs promote on a file already promoted**: the seed file's idempotent upsert (feature 001) recognizes the items via `content_hash` and reports them as `unchanged`. No duplicates.
- **The promoted items push the bank above the 200-item target**: a soft warning is shown; the promote still succeeds. There is no hard cap.
- **Claude returns content that mentions an outdated Azure feature**: the tooling cannot detect factual staleness automatically; reliance on the human review step is the safety net.
- **The Anthropic API key is exposed**: the command requires the key to come from a maintainer-local environment variable; it never reads it from a committed file and never writes it to logs or to draft contents.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All authoring tooling MUST live under `tools/author/` and MUST be runnable from the repo root via `pnpm author <subcommand>`.
- **FR-002**: The `draft` subcommand MUST accept `--type`, `--domain`, `--topic`, `--difficulty`, and `--count` arguments. All five MUST be required.
- **FR-003**: The `draft` subcommand MUST send Claude a prompt that includes: the JSON Schema for the requested type, the list of existing item UUIDs in the bank, the requested domain/topic/difficulty, and explicit instructions to return only valid JSON.
- **FR-004**: The `draft` subcommand MUST validate every returned item against the schema and write only valid, non-colliding items to `tools/author/drafts/<date>-<type>-<topic>.json`.
- **FR-005**: Items returned by Claude that fail validation or that collide with existing IDs MUST be reported with their `field` and `reason` to stderr, never silently dropped.
- **FR-006**: Drafts MUST be authored with `source: "ai-generated"` but MUST NOT carry `reviewer_id` or `reviewed_at` at draft time — those are set at promote time.
- **FR-007**: The `promote` subcommand MUST accept a draft file path and a `--reviewer` argument; both MUST be required.
- **FR-008**: The `promote` subcommand MUST re-validate every item before any write; any failure MUST abort the whole promote operation atomically.
- **FR-009**: Promoted items MUST be appended to the matching type's seed file, stamped with `reviewer_id = <args.reviewer>` and `reviewed_at = <current UTC>`.
- **FR-010**: The `rewrite-explanation` subcommand MUST accept one or more existing item IDs and a `--tone` argument, and MUST produce drafts where only `content.explanation` differs from the original.
- **FR-011**: The Anthropic API key MUST be read from a maintainer-local environment variable; the tooling MUST NOT accept it as a CLI argument or read it from a committed file.
- **FR-012**: All API calls to Anthropic MUST use the Claude SDK with prompt caching enabled for the schema and existing-IDs portions (which are stable across runs).
- **FR-013**: All tooling MUST emit structured logs on success (`{type, domain, topic, drafted, accepted, rejected, file}` JSON line) and MUST never log the API key, the prompt contents, or the maintainer's local file paths above the repo root.
- **FR-014**: The tooling MUST NOT call the Anthropic API in CI runs by default; an explicit env flag is required to enable network access in CI.
- **FR-015**: The tooling's output (`tools/author/drafts/*`) MUST be gitignored; only seed files (after promote) are committed.

### Key Entities

- **DraftFile**: A timestamped JSON file under `tools/author/drafts/` containing Claude-returned items pending human review.
- **AuthorRequest**: The CLI invocation parameters captured for logging (type, domain, topic, difficulty, count, but never the key).
- **PromoteResult**: The structured result of a promote operation — counts of items appended per seed file.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A maintainer can grow the bank by 50 reviewed items (from 50 to 100) in under one hour of total time, including review.
- **SC-002**: 100% of items rejected by validation are reported to stderr with a specific schema-violation reason.
- **SC-003**: 100% of items reaching the seed files carry `source: "ai-generated"`, a non-empty `reviewer_id`, and a `reviewed_at` timestamp within the last minute of the promote run.
- **SC-004**: Re-running `pnpm seed` after a promote results in exactly the count of new items appended, zero updates, zero unchanged-row mutations (feature 001's idempotency holds).
- **SC-005**: No production code path imports anything from `tools/author/`; verified by static analysis.
- **SC-006**: The Anthropic API key never appears in repo history, CI logs, or any committed file — verified by repo-wide search and CI log review.

## Assumptions

- The constitution Principle III locks AI to authoring-only. This feature is the canonical implementation of that principle; it cannot evolve into a runtime feature without a constitution amendment.
- The Anthropic SDK is used (`@anthropic-ai/sdk`); the model is the latest available Sonnet at promote time. The pinned model string is configurable.
- Prompt caching reduces cost on the stable parts of the prompt; the SDK's prompt-caching API is used per the claude-api skill guidance.
- Human review is the safety net; this feature does not add a model-grading or fact-checking step. Subject-matter accuracy depends on the reviewer.
- Concurrent draft files for the same domain/topic are allowed; collision is resolved at promote time.
- Promote does not deduplicate by content hash — that's the seed CLI's job (feature 001 FR-007).
- The 200-item bank target is the v1 ceiling for budgeting purposes; the tooling has no hard cap.
