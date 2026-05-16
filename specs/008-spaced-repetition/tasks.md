# Tasks: Spaced Repetition and Daily Review

**Branch**: `008-spaced-repetition` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Order is dependency-aware. `[P]` = can run in parallel with the previous task.

## Phase 0 — Verify ground state

- **T001** Confirm features 004, 005, 006 have all merged. This feature consumes their progress writes — without them, the due list is empty.
- **T002** Inspect `frontend/src/lib/flashcards/ratings.ts` (feature 004) and the equivalent in feature 005's quiz path. Confirm they currently each implement SM-2-lite locally. T060 below will refactor both onto the canonical policy.
- **T003** Confirm feature 007 dashboard exposes "weakest domain" data via a hook (`useDomainAccuracy()` or similar) — needed for the results-screen hand-off (US1 Acceptance 4).

## Phase 1 — Canonical spacing policy

- **T010** Create `frontend/src/lib/spacing/policy.types.ts` — `Rating = 'correct'|'almost'|'missed'`, `Interval = { days: number, doubleStreak: number }`.
- **T011** Create `frontend/src/lib/spacing/policy.ts` exporting `nextReview(prevInterval, rating, today)` → new `{ next_review: ISODate, interval }`. Implements:
  - correct → doubles previous interval; initial = 3 days; `doubleStreak += 1`
  - almost → 1 day; `doubleStreak` unchanged
  - missed → 1 day; `doubleStreak = 0`
- **T012** [P] `frontend/tests/unit/spacing-policy.test.ts` — every Acceptance Scenario from US2 plus a property test: same inputs → same output across 1000 runs (SC-002 determinism).
- **T013** [P] `frontend/tests/unit/spacing-policy-edge.test.ts` — DST transition: a 1-day interval is 24 hours; no half-day anomaly when the spring-forward day arrives.

## Phase 2 — Due-list builder

- **T020** Create `frontend/src/lib/spacing/due.ts` exporting `listDueItems(progressEntries, today)` → `DueItem[]` ordered by `next_review` ascending, with each `DueItem = { questionId, mode, nextReview }`.
- **T021** [P] `frontend/tests/unit/spacing-due.test.ts` — ordering correctness; today-or-earlier inclusion; entries for removed bank items get filtered (edge case).

## Phase 3 — Home-screen Daily Review hero (US1, P1) 🎯 MVP

- **T030** Create `frontend/src/components/DailyReviewHero.tsx` — reads `listDueItems` via a `useDueItems()` hook (computed from `useProgressStore`), shows the count, exposes a Start CTA. When count is 0, renders the "no reviews due — start a new session" alternative state.
- **T031** Update `frontend/src/pages/HomePage.tsx` (or wherever the home screen lives) to mount `DailyReviewHero` above the fold. SC-001: the hero must render within 500 ms of route mount.
- **T032** Add a small "Reviews due (12)" badge to the primary nav for quick discovery from anywhere.

**Checkpoint**: US1 partial — count is visible, CTA is visible. Session loop comes next.

## Phase 4 — Cross-mode session loop (US1 continued, P1)

- **T040** Create `frontend/src/lib/dailyReview/types.ts` — `DailyReviewSession`, `DailyReviewItem` (= `DueItem` plus the loaded bank row).
- **T041** Create `frontend/src/lib/dailyReview/selection.ts` exporting `buildDueSession(due, cap)` → `{ items, remainingAfterCap }`. Default cap 30 (FR-007).
- **T042** Create `frontend/src/lib/dailyReview/reducer.ts` — session reducer that advances through items; for each item, dispatches the rating write to the matching per-mode writer (no new write path).
- **T043** Create `frontend/src/components/DailyReviewItem.tsx` — a thin dispatcher: renders `<Flashcard>` if `mode='flashcard'`, `<QuizQuestion>` if `mode='mcq'`, `<CodeReviewItem>` if `mode='code-review'` (the last only if its `gameModes.codeReview` flag is on; otherwise filter out at `buildDueSession` time).
- **T044** Create `frontend/src/pages/DailyReviewSessionPage.tsx` at `/learn/daily-review/session` — mounts the reducer, renders `DailyReviewItem` for the current item, writes a `sessions` row with `mode='daily-review'` on completion (FR-009).
- **T045** Wire the home CTA → `/learn/daily-review/session`.
- **T046** [P] `frontend/tests/unit/dailyReview-reducer.test.ts` — terminal state when due exhausted, advancing across modes, no re-appearance of just-rated items within the same session (FR edge case).

**Checkpoint**: US1 fully complete — Daily Review works end-to-end.

## Phase 5 — SM-2-lite refactor (US2, P1)

- **T050** Update `frontend/src/lib/flashcards/ratings.ts` (feature 004): delete the local SM-2-lite math, import `nextReview` from `lib/spacing/policy.ts`. Preserve the `applyRating(entry, rating, now)` signature.
- **T051** [P] Update the equivalent path in feature 005's quiz rating writer (`frontend/src/pages/QuizSessionPage.tsx` rating handler or wherever it lives).
- **T052** [P] Update the equivalent path in feature 006 (`frontend/src/pages/CodeReviewSessionPage.tsx`).
- **T053** Update existing tests touched by the refactor — they should all still pass without behavior changes, since the canonical policy reproduces what each mode shipped.

**Checkpoint**: US2 complete — one canonical scheduling implementation.

## Phase 6 — Cap + "Review more" (US3, P2)

- **T060** In `buildDueSession`, truncate `items` to `cap`; return `remainingAfterCap` for the results screen.
- **T061** Create `frontend/src/pages/DailyReviewResultsPage.tsx` — score + counts + (if `remainingAfterCap > 0`) a "Review more" CTA that calls `buildDueSession` again with the next slice.
- **T062** Tag sessions opened via "Review more" with `extendedPastCap = true` (in the in-memory reducer state); pass it to the `sessions` row write so feature 007's daily-streak XP bonus rule can read it (FR-008: no daily-streak XP bonus on "Review more" sessions).
- **T063** Update `lib/stats/xp.ts` in feature 007 to honor `extendedPastCap` and skip the streak bonus for those rows. Coordinate the PR landing order.
- **T064** [P] `frontend/tests/unit/dailyReview-cap.test.ts` — 60 due → first session has 30, results show remaining 30, Review-more session has next 30, no XP daily-streak bonus on the second session.

**Checkpoint**: US3 complete — cap protects streak; explicit overrides don't game it.

## Phase 7 — Weakest-domain hand-off + cross-cutting

- **T070** On `DailyReviewResultsPage`, add a "Review more from your weakest domain" CTA that consumes feature 007's `useDomainAccuracy()` and routes to the right mode pre-filtered. Hide if no domain has < 60%.
- **T071** Run `pnpm -C frontend test` and `pnpm -C frontend lint`. Resolve.
- **T072** [P] Playwright smoke `frontend/tests/e2e/dailyreview-smoke.spec.ts` — fixture 5 due items across two modes; complete the session; verify the home counter drops to 0.
- **T073** Lighthouse on `/learn/daily-review/session` and the results page: a11y ≥ 90.

## Phase 8 — Manual verification

- **T080** `pnpm -C frontend dev`. Make sure at least 5 due items exist (or backdate fixtures). Verify the home hero shows the count, tap it, complete the session. Verify the home shows "no reviews due" afterward.
- **T081** Force 60 due items in fixtures; verify the cap at 30 + "Review more" path.
- **T082** Rate one item "correct" twice in a row over two days (or simulate via Date mocking) and verify the interval doubles.
- **T083** Verify `extendedPastCap` sessions don't bump the streak XP in feature 007's dashboard.

## Phase 9 — Cleanup

- **T090** Update `specs/008-spaced-repetition/checklists/requirements.md`.
- **T091** Remove the "duplicated SM-2-lite" complexity note from `specs/004-flashcard-mode/plan.md` (or mark the refactor as done in a follow-up commit).
- **T092** If `lib/spacing/policy.ts` ever needs per-exam tuning, lift its constants into `exams.config.json`. Not required for v1.

## Dependencies summary

- Phase 1 + Phase 2 block all session/UI work.
- Phase 5 (refactor 004/005/006) can land in parallel with Phase 4 — they share only the policy module.
- Phase 7 (T070) needs feature 007 merged.
- Phase 6 T063 cross-cuts into feature 007; coordinate the PR.
