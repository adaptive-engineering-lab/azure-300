# Tasks: Flashcard Mode

**Branch**: `004-flashcard-mode` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Order is dependency-aware. `[P]` = can run in parallel with the previous task.

## Phase 0 — Verify ground state

- **T001** Confirm `frontend/src/lib/auth` from feature 003 exists and exposes a usable session hook. If not, gate this feature on 003 landing first.
- **T002** Confirm at least 10 flashcard rows exist in `public.questions` where `type='flashcard'` across the five AI-300 domains. Run `select domain, count(*) from public.questions where type='flashcard' group by domain;` via MCP. If thin, queue an authoring task (feature 009 backfill) — flag, don't block.
- **T003** Confirm `frontend/src/pages/LearnIndexPage.tsx` (or equivalent `/learn` mode-selector) exists from feature 002; if absent, add a minimal one in T020.

## Phase 1 — Progress store adapters (foundational, blocks every story)

- **T010** Create `frontend/src/lib/progress/types.ts` defining `ProgressEntry`, `Rating = 'correct' | 'almost' | 'missed'`, `ProgressStore` interface.
- **T011** [P] Create `frontend/src/lib/progress/guestStore.ts` implementing `ProgressStore` against `localStorage` under `ai300game.v1.guest.progress`. Uses a single JSON blob with read-modify-write under a per-key lock to avoid race when rapid ratings interleave (FR-010 edge case).
- **T012** [P] Create `frontend/src/lib/progress/supabaseStore.ts` implementing `ProgressStore` against `user_progress` via the anon client + user JWT. Uses `upsert` on `(user_id, question_id)`.
- **T013** Create `frontend/src/lib/progress/store.ts` exporting a `useProgressStore()` hook that picks the right adapter based on `useAuth().status`.
- **T014** [P] `frontend/tests/unit/progress-guest.test.ts` — sequential ratings interleave correctly (no lost writes under the per-key lock).
- **T015** [P] `frontend/tests/unit/progress-supabase.test.ts` — mock client, assert upsert payloads.

## Phase 2 — Session selection + ordering (foundational, US2 depends on this)

- **T020** Create `frontend/src/lib/flashcards/types.ts` for `FlashcardSession`, `CardOrder`, `RatingEvent`.
- **T021** Create `frontend/src/lib/flashcards/ordering.ts` exporting `orderCards(due, fresh, length)`: interleaves due-first then unseen, randomized within each group, capped at `length`.
- **T022** Create `frontend/src/lib/flashcards/session.ts` exporting `selectCardsForSession(topic, length, progressEntries, bank)` → ordered card ids.
- **T023** Create `frontend/src/lib/flashcards/ratings.ts` exporting `applyRating(entry, rating, now)` → new `ProgressEntry`. Implements SM-2-lite: correct doubles interval (initial 3 days), almost = 1 day, missed = 1 day with streak reset.
- **T024** [P] `frontend/tests/unit/flashcard-ordering.test.ts` — due-first invariant, randomness bounded, length cap.
- **T025** [P] `frontend/tests/unit/flashcard-ratings.test.ts` — every (prior interval, rating) → expected new interval; idempotent against repeated `now`.

## Phase 3 — Session UI (US1, P1) 🎯 MVP

- **T030** Create `frontend/src/components/Flashcard.tsx` — front/back states with Framer Motion flip; respects `prefers-reduced-motion`; back scrolls when overflowing (edge case from spec).
- **T031** [P] Create `frontend/src/components/RatingControls.tsx` — three buttons (`Got it ✓`, `Almost`, `Missed ✗`) with hotkeys (1/2/3 on desktop).
- **T032** [P] Create `frontend/src/components/FlashcardSessionProgress.tsx` — "3 / 20" bar + the current streak/XP read-only display (read from `useProgressStore`).
- **T033** Create `frontend/src/pages/FlashcardSelectPage.tsx` at `/learn/flashcards` — topic select (the 5 AI-300 domains + a per-domain topic list driven by `exams.config.json`) + length picker (10/20/30) + "random mix" option + Start CTA.
- **T033b** In `FlashcardSelectPage`, read `?domains=<csv>` and `?domain=<slug>` from the URL query string and pre-populate the topic filter accordingly. Consumed by feature 005's `ReviewMissedCTA` (its T053/T054) and feature 007's `FocusAreasList` CTAs (its T041). If the query param names a domain not in `exams.config.json`, ignore it silently.
- **T034** Create `frontend/src/pages/FlashcardSessionPage.tsx` at `/learn/flashcards/session` — reducer-driven loop using `flashcards/reducer.ts`. On mount, calls `selectCardsForSession`. On each rating, calls `applyRating` and writes via `useProgressStore`. Swipe gestures via `react-swipeable`; equivalent buttons always rendered (FR-007).
- **T035** Create `frontend/src/components/FlashcardResultsPanel.tsx` — counts per rating, duration, "study another topic" CTA.
- **T036** Add routes in `frontend/src/main.tsx` (or `routes.tsx`): `/learn/flashcards` and `/learn/flashcards/session`. Register the home-screen CTA + the `/learn` mode-selector entry.
- **T037** Handle the "bank thinner than requested length" edge case: `selectCardsForSession` returns what's available and the session page renders a one-line notice above the first card.
- **T038** Wire `sessions` row write at session end (FR-010 implicit: every results screen records a `sessions` row with `mode='flashcard'`).

**Checkpoint**: US1 complete — full session loop end-to-end for a guest.

## Phase 4 — Due-first ordering for returning learners (US2, P2)

- **T040** In `selectCardsForSession`, branch on whether the progress store returns due entries for the chosen topic; pass them through `orderCards(due, fresh, length)` (T021 already supports this — wire it on).
- **T041** [P] `frontend/tests/unit/flashcard-due-first.test.ts` — given 3 due + 20 fresh + length 10, first 3 are due (random order), next 7 are fresh.
- **T042** [P] `frontend/tests/unit/flashcard-due-overflow.test.ts` — given 15 due + length 10, all 10 are due.

**Checkpoint**: US2 complete — returning learners see what they need to review first.

## Phase 5 — Ratings write progress correctly (US3, P2)

Most of US3 is already covered by T023 + T034 wiring `applyRating` → `useProgressStore`. This phase adds the persistence guarantees and observability.

- **T050** Ensure the rating write happens before `goToNextCard` in the reducer (Acceptance Scenario 3 — store reflects rating before next card renders).
- **T051** [P] `frontend/tests/unit/flashcard-sequence.test.ts` (already exists from AZ-104 fork — verify it still passes after T034 and update if needed). Cover the "rapid consecutive ratings" edge case explicitly.
- **T052** [P] Add a "retry-on-supabase-failure" wrapper in `supabaseStore`: optimistic local update, queue + retry the network write; surface a small offline indicator if the queue is non-empty (deferred to feature 010 if more polish needed — minimal MVP here).

**Checkpoint**: US3 complete — ratings persist, sequence preserved, observability acceptable.

## Phase 6 — Cross-cutting + Tests

- **T060** Component test `frontend/tests/components/Flashcard.test.tsx` — front renders, tap flips, back appears, `prefers-reduced-motion` skips animation.
- **T061** [P] Component test `frontend/tests/components/RatingControls.test.tsx` — hotkeys, button taps, disabled state during animation.
- **T062** [P] Playwright smoke `frontend/tests/e2e/flashcard-smoke.spec.ts` — start session, flip, swipe-right, repeat 3×, see results. Skip in CI if Playwright not installed locally; gate by env.
- **T063** Run `pnpm -C frontend test` and `pnpm -C frontend lint`. Resolve any failures.
- **T064** Run a Lighthouse audit on `/learn/flashcards/session` (manual or via feature 012 if landed). Confirm Accessibility ≥ 90.
- **T065** Measure the route-chunk gzipped size with `pnpm -C frontend build`; confirm the flashcard route adds < 100 KB gzipped (SC-005). If over, code-split Framer Motion behind a dynamic import.

## Phase 7 — Manual verification

- **T070** `pnpm -C frontend dev`. As a guest, complete a 10-card session in a single AI-300 topic. Verify counts, the swipe direction → rating mapping, and the results screen.
- **T071** Repeat as an authenticated user (sign in via feature 003). Verify `user_progress` rows appear via `mcp__supabase__execute_sql`.
- **T072** With the OS-level "Reduce motion" setting on, repeat: confirm no flip animation (or instant flip), all controls still reachable.
- **T073** Verify session-mid sign-in does NOT migrate during the session — the migration prompt only appears at session end (spec edge case + feature 003 FR-005).

## Phase 8 — Cleanup

- **T080** Update `specs/004-flashcard-mode/checklists/requirements.md` to mark satisfied items.
- **T081** If the SM-2-lite policy in `lib/flashcards/ratings.ts` diverges from what feature 008 will ship, note it as a TODO in the file and link to the 008 spec.

## Dependencies summary

- Phase 1 + Phase 2 block all UI work.
- US1 (Phase 3) blocks US2 (Phase 4) and US3 (Phase 5) — they're refinements of the loop.
- Phase 6 tests can be written in parallel with each implementation phase.
- Feature 003 (auth) is a soft prerequisite — guests can run the whole feature without 003, but authenticated writes need it.
