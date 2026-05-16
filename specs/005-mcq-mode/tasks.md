# Tasks: Multiple-Choice Quiz Mode

**Branch**: `005-mcq-mode` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Order is dependency-aware. `[P]` = can run in parallel with the previous task.

## Phase 0 — Verify ground state

- **T001** Confirm feature 004's `lib/progress/store.ts` is merged. If not, gate on 004.
- **T002** Confirm `public.questions` has ≥ 20 MCQ rows across the five AI-300 domains. Run `select domain, difficulty, count(*) from public.questions where type='mcq' group by 1,2;` via MCP.
- **T003** Inspect the existing AZ-104-forked `frontend/src/pages/QuizSessionPage.tsx`. Note what's salvageable (`computeDomainBreakdown` skeleton lives here per the unit test). Plan T040 to extract it into `lib/quiz/domainBreakdown.ts`.

## Phase 1 — Selection + reducer (foundational)

- **T010** Create `frontend/src/lib/quiz/types.ts` — `QuizSession`, `QuizAnswer`, `BreakdownRow`, `TimerState`.
- **T011** Create `frontend/src/lib/quiz/selection.ts` exporting `selectQuestions({ topic, difficulty, count, bank })` → ordered question ids. Filter to `type='mcq'` matching topic + difficulty; randomize; truncate to count; if fewer available than requested, return what exists (FR edge case).
- **T012** Create `frontend/src/lib/quiz/reducer.ts` — pure reducer for `{ idle | answering | revealed | finished }` transitions. Each answer event records `{ questionId, chosen, correct, elapsedSeconds }`.
- **T013** [P] `frontend/tests/unit/quiz-selection.test.ts` — topic/difficulty filter, count cap, fewer-than-requested fallback.
- **T014** [P] `frontend/tests/unit/quiz-reducer.test.ts` — transitions, idempotency, terminal `finished` state.

## Phase 2 — Timer subsystem (foundational for US2)

- **T020** Create `frontend/src/lib/quiz/timer.ts` exporting `useMonotonicCountdown(ms)` — uses `performance.now()`, returns `{ remaining, started, elapsed, expired }` and a `reset()` callback.
- **T021** Create `frontend/src/components/QuizTimerRing.tsx` — SVG ring driven by the hook; aria-live polite for the last 5 seconds.
- **T022** [P] `frontend/tests/unit/quiz-timer.test.ts` — fake timers, verify monotonic correctness across `Date.now()` jumps (simulate DST), and a 45 s countdown is within ±50 ms of fake-time advance.

## Phase 3 — Question UI + feedback (US1, P1) 🎯 MVP

- **T030** Create `frontend/src/components/QuizQuestion.tsx` — stem + four options (A/B/C/D). Tapping reveals feedback colors per FR-005. Keyboard: A/B/C/D selects, Space/Enter advances (FR-014). Disabled state during animation.
- **T031** Create `frontend/src/pages/QuizSelectPage.tsx` at `/learn/quiz` — topic select (AI-300 domains) + difficulty (1/2/3) + count (5/10/20) + timer toggle. Disabled "Start" until all required fields chosen.
- **T032** Rewrite `frontend/src/pages/QuizSessionPage.tsx` against the new reducer + selection. Render `QuizQuestion`; on answer reveal, write the progress update via `useProgressStore`; advance on Next.
- **T033** Handle the "explanation overflow" edge case: explanation panel scrolls within its container; "Next" remains pinned.
- **T034** Handle the "bank empty for filter" edge case: render an empty-state surface from `QuizSelectPage` if `selectQuestions` returns zero before navigation.
- **T035** Wire the `sessions` row write at session end with `mode='mcq'`, `topic`, `score_pct`, `duration_seconds`.
- **T036** Add routes for `/learn/quiz`, `/learn/quiz/session`, and `/learn/quiz/results` in the router.

**Checkpoint**: US1 complete — untimed MCQ session works end-to-end with feedback.

## Phase 4 — Per-question timer (US2, P2)

- **T040** Wire `QuizTimerRing` into `QuizSessionPage` when `timerEnabled`. Default 45 s per question.
- **T041** On timer expiry: mark the current question incorrect, reveal the correct option + explanation, enable Next. Same code path as the "wrong answer" flow.
- **T042** Pause timer when feedback is revealed (FR Acceptance Scenario 2): the elapsed value freezes; doesn't reset on Next.
- **T043** [P] `frontend/tests/unit/quiz-timer-integration.test.ts` — timer expiry triggers the same answer-recording path as a wrong tap.

**Checkpoint**: US2 complete — timer mode works deterministically.

## Phase 5 — Results screen + domain breakdown (US3, P2)

- **T050** Extract `computeDomainBreakdown(answers)` from `QuizSessionPage.tsx` into `frontend/src/lib/quiz/domainBreakdown.ts`. Make it pure: returns `BreakdownRow[]` sorted by domain. Keep the 60% threshold as a constant.
- **T051** [P] Update `frontend/tests/unit/domain-breakdown.test.ts` (already exists, uses AI-300 domains post-rename) to import from the new location.
- **T052** Create `frontend/src/components/DomainBreakdownChart.tsx` — recharts radar fed by `BreakdownRow[]`; weak domains rendered with a distinct shape marker (not color alone, FR-016).
- **T053** Create `frontend/src/components/ReviewMissedCTA.tsx` — receives the flagged weak domains, navigates to `/learn/flashcards?domains=<csv>` and the flashcard select page reads the query string to pre-populate the topic filter.
- **T054** Update `frontend/src/pages/FlashcardSelectPage.tsx` (from feature 004) to honor the `?domains=` query param. If a contributor lands 005 before 004 is fully merged, gate this task.
- **T055** Create `frontend/src/pages/QuizResultsPage.tsx` — overall score %, total time, `DomainBreakdownChart`, `ReviewMissedCTA`, plus the "no weak domains" fallback that links to "Review missed questions" (any wrong question, regardless of domain).
- **T056** [P] `frontend/tests/components/DomainBreakdownChart.test.tsx` — given mixed-accuracy rows, the radar renders the right shape and weak markers.

**Checkpoint**: US3 complete — weak domains flagged, CTA jumps cleanly into flashcards.

## Phase 6 — Cross-cutting + Tests

- **T060** Run `pnpm -C frontend test` and `pnpm -C frontend lint`. Resolve.
- **T061** Verify the keyboard hotkeys (A/B/C/D + Space/Enter) work end-to-end with a manual screen-reader test (VoiceOver on macOS; NVDA on Windows if available).
- **T062** [P] Playwright smoke `frontend/tests/e2e/quiz-smoke.spec.ts` — pick topic/difficulty/count, answer 3 questions wrong, see results, click "Review missed", verify the flashcard select page opens with the domain pre-selected.
- **T063** Measure the gzipped chunk delta for the quiz route. If recharts pushes the chunk over 200 KB, code-split the radar behind a dynamic import that only loads on the results page.

## Phase 7 — Manual verification

- **T070** `pnpm -C frontend dev`. Run a 5-question session in difficulty 2 with the timer off. Verify per-answer feedback, the explanation appears, and the results screen renders.
- **T071** Repeat with the timer on; let one question time out. Verify auto-marked incorrect + advance.
- **T072** Intentionally score one domain below 60%; verify the radar flags it and "Review missed" lands on the flashcard select page with that domain pre-selected.
- **T073** Confirm the session row appears in Supabase for authenticated learners via `mcp__supabase__execute_sql`.

## Phase 8 — Cleanup

- **T080** Update `specs/005-mcq-mode/checklists/requirements.md`.
- **T081** Remove any dead AZ-104 leftovers from the forked `QuizSessionPage.tsx` (old "Networking/Storage" domain strings etc., if any survived the earlier sweep).

## Dependencies summary

- Phase 1 + Phase 2 are independent and can land in parallel.
- US1 (Phase 3) blocks US2 (Phase 4) — timer attaches to the running loop.
- US3 (Phase 5) needs `ReviewMissedCTA` to land alongside the feature 004 query-param work (T054); coordinate.
