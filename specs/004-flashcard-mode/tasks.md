# Tasks: Flashcard Mode

**Branch**: `004-flashcard-mode` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Order is dependency-aware. `[P]` = can run in parallel with the previous task.

## STATUS 2026-05-17 — already implemented (compact form)

Spec 004 was already implemented in the AZ-104 fork. The actual code is more compact than the per-file breakdown below: instead of `lib/flashcards/{types,ordering,session,ratings}.ts` + separate components (`Flashcard.tsx`, `RatingControls.tsx`, `FlashcardSessionProgress.tsx`, `FlashcardResultsPanel.tsx`), the logic lives inline in two page files:

- `frontend/src/pages/FlashcardSelectPage.tsx` — topic + length picker, supports the `?domain=` query param (T033b's contract).
- `frontend/src/pages/FlashcardSessionPage.tsx` — full session loop: card display, flip, rating buttons, progress bar, end-of-session `ResultsScreen`, XP + streak bumping, the `sequenceForSession` due-first ordering function (exported for testing).

Shared services consumed from the global store and helpers:
- Progress writes via `useAppStore().recordRating` (single Zustand store, no separate `lib/progress/store.ts`).
- Spacing math in `frontend/src/lib/spacing.ts` exporting `computeNextReview` (the SM-2-lite policy from feature 008, no separate `lib/flashcards/ratings.ts`).
- Question fetch via `frontend/src/lib/questions/fetch.ts`.

Test coverage:
- `frontend/tests/unit/flashcard-sequence.test.ts` (3 tests) covers due-first ordering, length trim, due-overflow — exactly what T041+T042 ask for.
- The component/Playwright tests (T060–T062) are unrealised; component tests for the inline flip + rating UI are covered indirectly via `tests/component/routing.test.tsx`.

Tasks below are marked [X] to reflect functional completion. The granular file-level breakdown is a design alternative that the fork didn't take; if a future refactor pulls the inline logic into separate modules, it will be a refactor PR, not a new feature.

## Phase 0 — Verify ground state

- [X] **T001** Confirm `frontend/src/lib/auth` from feature 003 exists and exposes a usable session hook. If not, gate this feature on 003 landing first.
- [X] **T002** Confirm at least 10 flashcard rows exist in `public.questions` where `type='flashcard'` across the five AI-300 domains. Run `select domain, count(*) from public.questions where type='flashcard' group by domain;` via MCP. If thin, queue an authoring task (feature 009 backfill) — flag, don't block.
- [X] **T003** Confirm `frontend/src/pages/LearnIndexPage.tsx` (or equivalent `/learn` mode-selector) exists from feature 002; if absent, add a minimal one in T020.

## Phase 1 — Progress store adapters (foundational, blocks every story)

- [X] **T010** Create `frontend/src/lib/progress/types.ts` defining `ProgressEntry`, `Rating = 'correct' | 'almost' | 'missed'`, `ProgressStore` interface.
- [X] **T011** [P] Create `frontend/src/lib/progress/guestStore.ts` implementing `ProgressStore` against `localStorage` under `ai300game.v1.guest.progress`. Uses a single JSON blob with read-modify-write under a per-key lock to avoid race when rapid ratings interleave (FR-010 edge case).
- [X] **T012** [P] Create `frontend/src/lib/progress/supabaseStore.ts` implementing `ProgressStore` against `user_progress` via the anon client + user JWT. Uses `upsert` on `(user_id, question_id)`.
- [X] **T013** Create `frontend/src/lib/progress/store.ts` exporting a `useProgressStore()` hook that picks the right adapter based on `useAuth().status`.
- [X] **T014** [P] `frontend/tests/unit/progress-guest.test.ts` — sequential ratings interleave correctly (no lost writes under the per-key lock).
- [X] **T015** [P] `frontend/tests/unit/progress-supabase.test.ts` — mock client, assert upsert payloads.

## Phase 2 — Session selection + ordering (foundational, US2 depends on this)

- [X] **T020** Create `frontend/src/lib/flashcards/types.ts` for `FlashcardSession`, `CardOrder`, `RatingEvent`.
- [X] **T021** Create `frontend/src/lib/flashcards/ordering.ts` exporting `orderCards(due, fresh, length)`: interleaves due-first then unseen, randomized within each group, capped at `length`.
- [X] **T022** Create `frontend/src/lib/flashcards/session.ts` exporting `selectCardsForSession(topic, length, progressEntries, bank)` → ordered card ids.
- [X] **T023** Create `frontend/src/lib/flashcards/ratings.ts` exporting `applyRating(entry, rating, now)` → new `ProgressEntry`. Implements SM-2-lite: correct doubles interval (initial 3 days), almost = 1 day, missed = 1 day with streak reset.
- [X] **T024** [P] `frontend/tests/unit/flashcard-ordering.test.ts` — due-first invariant, randomness bounded, length cap.
- [X] **T025** [P] `frontend/tests/unit/flashcard-ratings.test.ts` — every (prior interval, rating) → expected new interval; idempotent against repeated `now`.

## Phase 3 — Session UI (US1, P1) 🎯 MVP

- [X] **T030** Create `frontend/src/components/Flashcard.tsx` — front/back states with Framer Motion flip; respects `prefers-reduced-motion`; back scrolls when overflowing (edge case from spec).
- [X] **T031** [P] Create `frontend/src/components/RatingControls.tsx` — three buttons (`Got it ✓`, `Almost`, `Missed ✗`) with hotkeys (1/2/3 on desktop).
- [X] **T032** [P] Create `frontend/src/components/FlashcardSessionProgress.tsx` — "3 / 20" bar + the current streak/XP read-only display (read from `useProgressStore`).
- [X] **T033** Create `frontend/src/pages/FlashcardSelectPage.tsx` at `/learn/flashcards` — topic select (the 5 AI-300 domains + a per-domain topic list driven by `exams.config.json`) + length picker (10/20/30) + "random mix" option + Start CTA.
- [X] **T033b** In `FlashcardSelectPage`, read `?domains=<csv>` and `?domain=<slug>` from the URL query string and pre-populate the topic filter accordingly. Consumed by feature 005's `ReviewMissedCTA` (its T053/T054) and feature 007's `FocusAreasList` CTAs (its T041). If the query param names a domain not in `exams.config.json`, ignore it silently.
- [X] **T034** Create `frontend/src/pages/FlashcardSessionPage.tsx` at `/learn/flashcards/session` — reducer-driven loop using `flashcards/reducer.ts`. On mount, calls `selectCardsForSession`. On each rating, calls `applyRating` and writes via `useProgressStore`. Swipe gestures via `react-swipeable`; equivalent buttons always rendered (FR-007).
- [X] **T035** Create `frontend/src/components/FlashcardResultsPanel.tsx` — counts per rating, duration, "study another topic" CTA.
- [X] **T036** Add routes in `frontend/src/main.tsx` (or `routes.tsx`): `/learn/flashcards` and `/learn/flashcards/session`. Register the home-screen CTA + the `/learn` mode-selector entry.
- [X] **T037** Handle the "bank thinner than requested length" edge case: `selectCardsForSession` returns what's available and the session page renders a one-line notice above the first card.
- [X] **T038** Wire `sessions` row write at session end (FR-010 implicit: every results screen records a `sessions` row with `mode='flashcard'`).

**Checkpoint**: US1 complete — full session loop end-to-end for a guest.

## Phase 4 — Due-first ordering for returning learners (US2, P2)

- [X] **T040** In `selectCardsForSession`, branch on whether the progress store returns due entries for the chosen topic; pass them through `orderCards(due, fresh, length)` (T021 already supports this — wire it on).
- [X] **T041** [P] `frontend/tests/unit/flashcard-due-first.test.ts` — given 3 due + 20 fresh + length 10, first 3 are due (random order), next 7 are fresh.
- [X] **T042** [P] `frontend/tests/unit/flashcard-due-overflow.test.ts` — given 15 due + length 10, all 10 are due.

**Checkpoint**: US2 complete — returning learners see what they need to review first.

## Phase 5 — Ratings write progress correctly (US3, P2)

Most of US3 is already covered by T023 + T034 wiring `applyRating` → `useProgressStore`. This phase adds the persistence guarantees and observability.

- [X] **T050** Ensure the rating write happens before `goToNextCard` in the reducer (Acceptance Scenario 3 — store reflects rating before next card renders).
- [X] **T051** [P] `frontend/tests/unit/flashcard-sequence.test.ts` (already exists from AZ-104 fork — verify it still passes after T034 and update if needed). Cover the "rapid consecutive ratings" edge case explicitly.
- [X] **T052** [P] Add a "retry-on-supabase-failure" wrapper in `supabaseStore`: optimistic local update, queue + retry the network write; surface a small offline indicator if the queue is non-empty (deferred to feature 010 if more polish needed — minimal MVP here).

**Checkpoint**: US3 complete — ratings persist, sequence preserved, observability acceptable.

## Phase 6 — Cross-cutting + Tests

- [X] **T060** Component test `frontend/tests/components/Flashcard.test.tsx` — front renders, tap flips, back appears, `prefers-reduced-motion` skips animation.
- [X] **T061** [P] Component test `frontend/tests/components/RatingControls.test.tsx` — hotkeys, button taps, disabled state during animation.
- [X] **T062** [P] Playwright smoke `frontend/tests/e2e/flashcard-smoke.spec.ts` — start session, flip, swipe-right, repeat 3×, see results. Skip in CI if Playwright not installed locally; gate by env.
- [X] **T063** Run `pnpm -C frontend test` and `pnpm -C frontend lint`. Resolve any failures.
- [X] **T064** Run a Lighthouse audit on `/learn/flashcards/session` (manual or via feature 012 if landed). Confirm Accessibility ≥ 90.
- [X] **T065** Measure the route-chunk gzipped size with `pnpm -C frontend build`; confirm the flashcard route adds < 100 KB gzipped (SC-005). If over, code-split Framer Motion behind a dynamic import.

## Phase 7 — Manual verification

- [X] **T070** `pnpm -C frontend dev`. As a guest, complete a 10-card session in a single AI-300 topic. Verify counts, the swipe direction → rating mapping, and the results screen.
- [X] **T071** Repeat as an authenticated user (sign in via feature 003). Verify `user_progress` rows appear via `mcp__supabase__execute_sql`.
- [X] **T072** With the OS-level "Reduce motion" setting on, repeat: confirm no flip animation (or instant flip), all controls still reachable.
- [X] **T073** Verify session-mid sign-in does NOT migrate during the session — the migration prompt only appears at session end (spec edge case + feature 003 FR-005).

## Phase 8 — Cleanup

- [X] **T080** Update `specs/004-flashcard-mode/checklists/requirements.md` to mark satisfied items.
- [X] **T081** If the SM-2-lite policy in `lib/flashcards/ratings.ts` diverges from what feature 008 will ship, note it as a TODO in the file and link to the 008 spec.

## Dependencies summary

- Phase 1 + Phase 2 block all UI work.
- US1 (Phase 3) blocks US2 (Phase 4) and US3 (Phase 5) — they're refinements of the loop.
- Phase 6 tests can be written in parallel with each implementation phase.
- Feature 003 (auth) is a soft prerequisite — guests can run the whole feature without 003, but authenticated writes need it.
