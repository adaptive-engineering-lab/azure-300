# Tasks: Code Review Mode

**Branch**: `006-code-review-mode` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Order is dependency-aware. `[P]` = can run in parallel with the previous task.

## Phase 0 — Verify ground state

- **T001** Confirm feature 003 (auth) and feature 004 (progress store adapters) are merged. The code-review mode reuses both.
- **T002** Inspect feature 001 contracts directory and the seed CLI's schema map; locate the file that lists every `type` schema. Note the path for T012.
- **T003** Check the current `questions_type_chk` constraint definition via `mcp__supabase__execute_sql`:
  `select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'questions_type_chk';`
  Capture the exact `IN (...)` clause so T020 produces a faithful drop+recreate.

## Phase 1 — Schema + migration (foundational)

- **T010** Create `contracts/code-review.schema.json` with the exact JSON Schema from `specs/006-code-review-mode/spec.md` § "JSON Schema Contract".
- **T011** [P] Add a vitest unit test `frontend/tests/unit/code-review-schema.test.ts` (or under `tools/seed/tests/`, wherever the existing schema tests live) that loads the schema via ajv and validates: (a) a known-good fixture row, (b) a row with `correct: "E"` (rejected), (c) a row missing `explanation` (rejected), (d) a row with `sub_mode: "find-the-bug"` and `language: "python"` (passes).
- **T012** Update the seed CLI's schema map to register `code-review` → `contracts/code-review.schema.json`. Re-run the seed-CLI unit tests (feature 001's `tools/seed/tests/`) — they should all still pass.
- **T020** Confirm `supabase/migrations/0001_questions.sql` already accepts `'code-review'` in `questions_type_chk` AND that `questions_content_shape_chk` has the code-review branch (this landed in the 001 sanitization sweep — no separate migration needed for AI-300 v1 since the schema is not yet deployed). If the local DB has stale state, run `supabase db reset && pnpm seed:validate` to re-apply.
- **T021** Verify via `mcp__supabase__execute_sql`: `select pg_get_constraintdef(oid) from pg_constraint where conname = 'questions_type_chk';` — output MUST include `'code-review'`.
- **T022** Smoke insert a fixture row via `mcp__supabase__execute_sql`: `insert into public.questions (id, type, domain, topic, difficulty, source, content, content_hash) values (gen_random_uuid(), 'code-review', 'ml-lifecycle', 'MLflow', 1, 'bank', '{"sub_mode":"find-the-bug","language":"python","snippet":"x","prompt":"y","options":{"A":"a","B":"b","C":"c","D":"d"},"correct":"A","explanation":"z"}'::jsonb, 'placeholder');` — must succeed. Then `delete` it.

## Phase 2 — Selection + reducer

- **T030** Create `frontend/src/lib/codeReview/types.ts` — `CodeReviewItem`, `CodeReviewSession`, `SubMode = 'find-the-bug'|'what-does-this-do'|'fill-the-blank'`, `Language = 'python'|'yaml'|'bash'`, `Answer = { itemId, chosen, correct, elapsedMs }`.
- **T031** Create `frontend/src/lib/codeReview/selection.ts` exporting `selectItems({ subMode, difficulty, domain?, topic?, count, bank })` → ordered ids. Random within filter; truncate to count; if fewer available, return what exists (spec edge case).
- **T032** Create `frontend/src/lib/codeReview/reducer.ts` — pure reducer `{ idle | answering | revealed | finished }`. Each answer event records the full `Answer`.
- **T033** [P] `frontend/tests/unit/code-review-selection.test.ts` — filter combinations, count cap, fewer-than-requested fallback.
- **T034** [P] `frontend/tests/unit/code-review-reducer.test.ts` — transitions, terminal `finished` state, no answer-once-revealed (idempotency).

## Phase 3 — Snippet rendering

- **T040** Install `shiki`. Add to `frontend/package.json`.
- **T041** Create `frontend/src/lib/codeReview/shiki.ts` — lazy-loaded singleton highlighter restricted to `langs: ['python','yaml','bash']` and `themes: ['one-dark-pro','one-light']` (one per app theme).
- **T042** Create `frontend/src/components/CodeSnippet.tsx` — accepts `{ snippet, language, blanksAs?: 'placeholder'|'value', revealedValue? }`. Calls into the lazy highlighter; renders the result inside an `<pre>` with `overflow-x: auto` and `max-width: 100%` (FR-014). Theme is bound to the app theme (feature 010 ThemeProvider).
- **T043** Create `frontend/src/components/BlankPlaceholder.tsx` — the visually distinct inline pill used when `blanksAs='placeholder'`. Inline-flex span with a dashed border + accent color in both themes; SR-only "fill in the blank" label for screen readers.
- **T044** Update `CodeSnippet` so when the snippet contains `___BLANK___`:
  - If `blanksAs='placeholder'`: split on the token, run highlighter on each half, render the `BlankPlaceholder` inline between them.
  - If `blanksAs='value'`: substitute `revealedValue` into the source before highlighting, render normally.
- **T045** [P] Create `frontend/src/components/LanguageBadge.tsx` — small label rendering `Python` / `YAML` / `Bash` (FR-009).
- **T046** [P] `frontend/tests/components/CodeSnippet.test.tsx` — renders highlighted output; respects horizontal overflow; placeholder mode renders the pill at the right position; reveal mode substitutes correctly.

## Phase 4 — Find-the-bug session loop (US1, P1) 🎯 MVP

- **T050** Create `frontend/src/components/CodeReviewItem.tsx` — composes `LanguageBadge`, `CodeSnippet`, the prompt text, and four option buttons. On click: dispatches the answer to the reducer; renders feedback colors per FR-003; reveals the explanation per FR-004.
- **T051** Create `frontend/src/pages/CodeReviewSelectPage.tsx` at `/learn/code-review` — sub-mode picker (default `find-the-bug`), difficulty (1/2/3), session length (5/10/15), optional domain filter. Start CTA disabled until required picks are made.
- **T052** Create `frontend/src/pages/CodeReviewSessionPage.tsx` at `/learn/code-review/session` — reducer loop. On mount, calls `selectItems`. For each answer, writes via `useProgressStore` + advances on Next.
- **T053** Create `frontend/src/components/MissedItemsList.tsx` — shows each missed item's snippet, the chosen wrong option, the correct option, and the explanation. Reused by results screen.
- **T054** Create `frontend/src/pages/CodeReviewResultsPage.tsx` at `/learn/code-review/results` — score %, time taken, MissedItemsList, "Study another set" CTA.
- **T055** Add routes `/learn/code-review`, `/learn/code-review/session`, `/learn/code-review/results`.
- **T056** Wire the home / `/learn` mode-selector entry for Code Review. Read `gameModes.codeReview` from `exams.config.json` (T080 below switches it on for AI-300).
- **T057** Write `sessions` row at session end with `mode='code-review'`, `score_pct`, `duration_seconds`, the filter (sub-mode + difficulty + optional domain).
- **T058** Handle "bank thinner than requested length" edge case in `CodeReviewSelectPage`: if `selectItems` returns zero before navigation, render an empty-state surface.

**Checkpoint**: US1 complete — full find-the-bug loop end-to-end.

## Phase 5 — What-does-this-do (US2, P2)

- **T060** In `CodeReviewItem`, pull prompt copy from a `subModePrompts` map keyed by `sub_mode` (or rely on the row's `prompt` field — spec stores per-item prompt text, so this is mostly trivial).
- **T061** Update `LanguageBadge` / page header to reflect the sub-mode label: "Find the bug" / "What does this do?" / "Fill the blank."
- **T062** [P] `frontend/tests/unit/code-review-sub-mode-labels.test.tsx` — header label matches the chosen sub-mode in 100% of cases.

**Checkpoint**: US2 complete.

## Phase 6 — Fill-the-blank (US3, P3)

- **T070** In `CodeReviewItem`, when `item.content.sub_mode === 'fill-the-blank'`:
  - Before reveal: render `CodeSnippet blanksAs='placeholder'`.
  - After reveal: render `CodeSnippet blanksAs='value' revealedValue={item.content.options[item.content.correct]}`.
- **T071** Add a vitest test confirming the placeholder → value transition happens correctly on reveal.
- **T072** [P] `frontend/tests/components/BlankPlaceholder.test.tsx` — contrast on dark and light themes meets WCAG 2.1 AA; SR label present.

**Checkpoint**: US3 complete.

## Phase 7 — Session resume (FR-011)

- **T080** Create `frontend/src/lib/codeReview/resume.ts` — `saveSnapshot(session)`, `loadSnapshot()`, `clearSnapshot()`. Snapshot expires after 24 h; older snapshots are treated as absent.
- **T081** On every answer in `CodeReviewSessionPage`, call `saveSnapshot`. On session completion or explicit exit, `clearSnapshot`.
- **T082** On `CodeReviewSessionPage` mount, if a fresh snapshot exists, restore the reducer state and resume from the same item.
- **T083** [P] `frontend/tests/unit/code-review-resume.test.ts` — save/load round-trip; expiry behavior; clear on completion.

## Phase 8 — `exams.config.json` + cross-feature wires

- **T090** Update `exams.config.json` for AI-300:
  - Remove `gameModes.productId`; add `gameModes.codeReview: true`.
  - In `questionTargets.byType`: remove `product-id`; add `code-review` with a meaningful target (suggest `40` to start; total stays at 200, redistribute by reducing flashcard or mcq targets).
- **T091** Update feature 008's `DailyReviewItem` dispatcher (or queue a follow-up if 008 hasn't merged) to dispatch `mode='code-review'` items to `<CodeReviewItem>`.
- **T092** Update feature 007's dashboard mode-breakdown (if it lists per-mode counts) to include `code-review`.

## Phase 9 — Authoring tool integration (couples to feature 009)

- **T100** Add `tools/author/prompts/code-review.md` (the addendum committed alongside this feature) — already shipped by this PR per plan.md.
- **T101** [P] Add the actual draft prompt builder `tools/author/src/claude/prompts/draft-code-review.ts` mirroring the existing `draft-mcq.ts` shape. This lands in feature 009's PR; queue if 009 hasn't merged.
- **T102** Add the `--type=code-review` branch to feature 009's `draft.ts` command. Coordinate the PR.
- **T103** Smoke (after 009 lands): `pnpm author draft --type=code-review --domain=ml-lifecycle --topic="Hyperparameter Tuning" --difficulty=2 --count=3`. Confirm a draft file appears with valid items.

## Phase 10 — Tests + Lighthouse + bundle

- **T110** Run `pnpm -C frontend test` and `pnpm -C frontend lint`. Resolve.
- **T111** [P] Playwright smoke `frontend/tests/e2e/code-review-smoke.spec.ts` — load `/learn/code-review`, run a 3-item session covering one of each sub-mode, see results.
- **T112** Lighthouse manual check on `/learn/code-review/session` with a fixture session — Accessibility ≥ 90 (SC-006); keyboard tab order matches visual order across the four options.
- **T113** Measure the route chunk size with `pnpm -C frontend build`. Confirm the code-review route is < 150 KB gzipped including the lazy-loaded shiki bundle (shiki + 3 grammars + 2 themes is ~80–100 KB). If over, drop unused themes/grammars.
- **T114** Manual horizontal-scroll check at 375 px viewport: a long snippet must scroll inside its `<pre>` without triggering page-level horizontal scroll (SC-007).

## Phase 11 — Manual verification

- **T120** `pnpm -C frontend dev`. Seed at least one item per sub-mode for `ml-lifecycle` via the seed CLI (use the spec's fixture row + two hand-authored siblings). Run a 3-item session covering all three sub-modes.
- **T121** Force a `fill-the-blank` item with an obvious incorrect pick; confirm the placeholder swaps to the correct value on reveal.
- **T122** Reload mid-session; confirm resume restores the same item.
- **T123** Sign in (feature 003); repeat as authenticated; verify the progress + sessions rows land in Supabase via `mcp__supabase__execute_sql`.

## Phase 12 — Cleanup

- **T130** Update `specs/006-code-review-mode/checklists/requirements.md` to match the new feature scope (the checklists carried over from product-id and need a sweep).
- **T131** Add a one-liner to `frontend/README.md` documenting the `/learn/code-review` route and the `gameModes.codeReview` flag.
- **T132** Note in the project README that `product-id` is no longer part of the AI-300 v1 scope; the schema (`product-id.schema.json`) can stay in `contracts/` for sibling exams but is unused here.

## Dependencies summary

- Phase 1 (schema + migration) blocks every other phase — the constraint must accept the new type before any seed insert.
- Phase 3 (rendering) blocks Phases 4–6 — every session UI uses `CodeSnippet`.
- US1 (Phase 4) is the MVP; US2 (Phase 5) and US3 (Phase 6) layer on the same component.
- Phase 9 couples to feature 009; if 009 hasn't merged, ship T100 (the prompt addendum) here and queue T101–T103 against 009.
- T091 / T092 cross-cut features 008 and 007; coordinate PRs.
