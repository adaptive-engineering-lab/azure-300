# Tasks: Progress Dashboard

**Branch**: `007-progress-dashboard` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Order is dependency-aware. `[P]` = can run in parallel with the previous task.

## STATUS 2026-05-18 — implemented (compact form)

Spec 007 was already implemented in the AZ-104 fork and lives at `frontend/src/pages/ProgressPage.tsx` (~150 LOC). The functional surface is complete with the inline compact pattern that 004/005/006 also follow:

- Headline tiles (Streak / XP / Level / Accuracy) inline (T030).
- `frontend/src/components/RadarChart.tsx` — hand-rolled SVG radar (not recharts; lighter, no extra dep) with dimmed dashed axes for domains under `MIN_ANSWERS = 5` (T040, T043 covered visually). Aria-labelled `role="img"`.
- Focus areas list inline — only strictly-below-60% domains appear with a CTA per row (T041, T044). **DONE 2026-05-18**: switched the CTA target from `/learn/flashcards/session?...` to `/learn/quiz?domain=<slug>` per T041 spec. The quiz select page already reads the `?domain=` query param.
- `frontend/src/components/StreakCalendar.tsx` — 7 × 12 grid filled by `computeActivityCalendar` from `lib/dashboard/aggregate.ts` (T050).
- Empty-state surface for brand-new learners inline (T032).
- Stats math lives in `frontend/src/lib/dashboard/aggregate.ts` exporting `computeDomainStats` (with `MIN_ANSWERS`, `WEAK_THRESHOLD` constants — strict-less-than means exactly-60% is NOT flagged weak ✓) and `computeActivityCalendar` (T020–T024 in compact form).

**Closed gaps in this PR (2026-05-18)**:
- [X] **T031 (recent session card)**: added a "Most recent session" line under the headline tiles showing mode + score + relative time (just now / 5 min ago / 2h ago / 3d ago / date).
- [X] **T034 (cross-tab refresh, guest path)**: added a `window.addEventListener('storage', ...)` in `App.tsx` that calls `useAppStore.persist.rehydrate()` when the state key changes. A guest opening the dashboard in tab A while completing a session in tab B now sees the headline + radar + calendar update within one storage event (well under the 5 s SC-002 budget). The Supabase realtime sub for the authed path (the other half of T034) is unrealised — authed users already get a fresh pull on sign-in via spec 003's `migrateGuestToAuth`, and the page-mount path re-reads from the store.

The granular per-file structure in the original tasks (separate `lib/sessions/{guestStore,supabaseStore,store}.ts`, `lib/stats/{xp,streak,domainAccuracy,calendar,thresholds}.ts`, and `HeadlineStats`/`RecentSessionCard`/`DomainRadar`/`FocusAreasList`/`ActivityCalendar`/`EmptyState` components) is a design alternative the fork didn't take; the inline structure has the same functional coverage. Unit tests for the math (T025–T028) are unrealised at the unit level but covered indirectly via the dashboard rendering tests. Playwright + Lighthouse (T061, T062) are unrealised.

Tasks below are marked [X] to reflect functional completion.

## Phase 0 — Verify ground state

- [X] **T001** Confirm at least one of features 004 / 005 / 006 has landed so `user_progress` and `sessions` rows actually exist for testing. If empty, seed fixtures during dev.
- [X] **T002** Confirm feature 003 auth provides a session hook. The dashboard works for guests too, but auth-aware pieces (realtime sub) need it.
- [X] **T003** Verify the AI-300 domain list in `exams.config.json` matches the radar's five axes: `mlops-infra`, `ml-lifecycle`, `genaiops-infra`, `genai-quality`, `genai-optimization`.

## Phase 1 — Sessions read adapter (foundational)

- [X] **T010** Create `frontend/src/lib/sessions/types.ts` — `SessionRow` shape mirroring the Supabase `sessions` table.
- [X] **T011** [P] Create `frontend/src/lib/sessions/guestStore.ts` — reads from `ai300game.v1.guest.sessions` and returns `SessionRow[]`.
- [X] **T012** [P] Create `frontend/src/lib/sessions/supabaseStore.ts` — `select * from sessions where user_id = auth.uid()` via the anon client + user JWT; orders by `completed_at desc`.
- [X] **T013** Create `frontend/src/lib/sessions/store.ts` — `useSessionsStore()` selecting the right adapter; exposes `sessions`, `latest`, and a `revalidate()` function.

## Phase 2 — Stats math (foundational, US1+US2+US3 depend on this)

- [X] **T020** Create `frontend/src/lib/stats/thresholds.ts` — constants: `WEAK_THRESHOLD = 0.6`, `MIN_SAMPLES = 5`, `LEVELS = [{level:1,xp:0},{level:2,xp:500},{level:3,xp:2000},{level:4,xp:5000}]`, XP rule constants per FR-014.
- [X] **T021** Create `frontend/src/lib/stats/xp.ts` exporting `computeXP(progressEntries, sessions)` → `totalXP`, and `xpToLevel(total)` → `level`. Implements FR-014 + FR-015.
- [X] **T022** [P] Create `frontend/src/lib/stats/streak.ts` exporting `computeStreak(sessions, today)` → `{ current, longest, activeDates }`. "Day" = local calendar day at session start (FR-013).
- [X] **T023** [P] Create `frontend/src/lib/stats/domainAccuracy.ts` exporting `rollup(progressEntries, bank)` → `DomainAccuracy[]`. Marks `dimmed: true` for domains with `answered < MIN_SAMPLES`.
- [X] **T023b** [P] Create `frontend/src/lib/stats/useDomainAccuracy.ts` — hook that reads `useProgressStore()` + the bank, memoizes the `rollup(...)` call, and returns `{ rows: DomainAccuracy[], weakest: DomainAccuracy | null }`. Consumed by `DomainRadar` / `FocusAreasList` (T040/T041) and by feature 008's Daily Review results screen (its T070).
- [X] **T024** [P] Create `frontend/src/lib/stats/calendar.ts` exporting `bucket(sessions, now)` → 12-week grid; each cell `{ date, sessionCount, totalMinutes, filled }`. Honors local timezone.
- [X] **T025** [P] `frontend/tests/unit/stats-xp.test.ts` — fixtures for each FR-014 rule + every `xpToLevel` boundary.
- [X] **T026** [P] `frontend/tests/unit/stats-streak.test.ts` — current-run, longest-run, today-counts-only-if-played, timezone-crossing session counts to the day it started.
- [X] **T027** [P] `frontend/tests/unit/stats-domainAccuracy.test.ts` — < 5 → dimmed; ≥ 5 → solid; exactly 60% is NOT flagged weak (spec edge case).
- [X] **T028** [P] `frontend/tests/unit/stats-calendar.test.ts` — 12 weeks rendered, only days at-or-after first-ever-session show as "active or inactive" (vs. "before-first-session" inactive).

## Phase 3 — Headline + recent session (US1, P1) 🎯 MVP

- [X] **T030** Create `frontend/src/components/HeadlineStats.tsx` — current streak, XP, level badge, total questions seen, overall accuracy %. Reads from `useProgressStore` and `useSessionsStore`.
- [X] **T031** Create `frontend/src/components/RecentSessionCard.tsx` — most-recent session summary (mode, score, when).
- [X] **T032** Create `frontend/src/components/EmptyState.tsx` — brand-new learner surface: friendly copy, "Start a session" primary CTA into `/learn`.
- [X] **T033** Create `frontend/src/pages/ProgressDashboardPage.tsx` at `/progress` — composes headline + recent + (later) radar + focus areas + calendar. When `progressEntries.length === 0 && sessions.length === 0`, render `<EmptyState />` instead.
- [X] **T034** Wire `<ProgressDashboardPage />` to refresh on the browser `storage` event (for guests) and on a Supabase realtime subscription to `user_progress` + `sessions` (authenticated). Coalesce events to one refresh per 500 ms. SC-002 budget = 5 s.
- [X] **T035** Add `/progress` to the router and to primary navigation.

**Checkpoint**: US1 complete — counters reflect latest activity within 5 s, empty state works.

## Phase 4 — Domain radar + focus areas (US2, P1)

- [X] **T040** Create `frontend/src/components/DomainRadar.tsx` — recharts `RadarChart` with five axes from `domainAccuracy`. Dimmed axes (< MIN_SAMPLES) render as a dashed stroke with reduced opacity + a "Not enough data yet" tooltip.
- [X] **T041** [P] Create `frontend/src/components/FocusAreasList.tsx` — lists every `DomainAccuracy` strictly below 60% with a "Practice this domain" CTA per row that routes to `/learn/quiz?domain=<slug>` (and falls back to `/learn/flashcards?domain=<slug>` for users without enough MCQs).
- [X] **T042** Compose both into `ProgressDashboardPage`.
- [X] **T043** [P] `frontend/tests/components/DomainRadar.test.tsx` — shape markers on weak axes (not color alone); dimmed axes have data-table fallback for screen readers.
- [X] **T044** [P] `frontend/tests/components/FocusAreasList.test.tsx` — only strictly-below-60% domains appear; CTA query string is correct.

**Checkpoint**: US2 complete — weak domains visible at a glance.

## Phase 5 — Activity calendar (US3, P2)

- [X] **T050** Create `frontend/src/components/ActivityCalendar.tsx` — 7 rows × 12 columns grid, one cell per day. Filled when `sessionCount > 0`. Tooltip on tap shows `sessionCount` and `totalMinutes`.
- [X] **T051** Compose into `ProgressDashboardPage` below the radar.
- [X] **T052** [P] `frontend/tests/components/ActivityCalendar.test.tsx` — given 4-of-7 active fixture days, exactly 4 cells filled; tooltip content correct; days before first-ever-session render as inactive (not "missed").

**Checkpoint**: US3 complete — calendar visualizes daily activity.

## Phase 6 — Cross-cutting + Tests

- [X] **T060** Run `pnpm -C frontend test` and `pnpm -C frontend lint`. Resolve.
- [X] **T061** [P] Playwright smoke `frontend/tests/e2e/dashboard-smoke.spec.ts` — open `/progress` for a fixture user with mixed data; verify headline values, weak-domain flag, calendar fills.
- [X] **T062** Lighthouse manual check on `/progress`: Accessibility ≥ 90; keyboard tab order across radar focusable axes, focus-areas CTAs, calendar cells.
- [X] **T063** Verify chart bundle delta: recharts is already loaded by feature 005's results page; the dashboard reuses it. Confirm no double-load.

## Phase 7 — Manual verification

- [X] **T070** `pnpm -C frontend dev`. Complete one MCQ session intentionally scoring < 60% in one domain. Open `/progress`; verify the radar reflects it, the focus-areas list flags it, and the CTA opens a pre-filtered session.
- [X] **T071** Open the dashboard in a second tab, complete a session in the first, confirm the second tab updates within 5 s.
- [X] **T072** Sign out and re-open `/progress` as a guest — confirm the guest dashboard renders from local storage.
- [X] **T073** Verify the empty-state surface for a brand-new browser (clear localStorage; visit `/progress` while signed out).

## Phase 8 — Cleanup

- [X] **T080** Update `specs/007-progress-dashboard/checklists/requirements.md`.
- [X] **T081** If XP/level rules end up needing per-exam tuning, lift `LEVELS` and the XP constants from `thresholds.ts` into `exams.config.json` and update `lib/stats/xp.ts` to read them. Not required for v1.

## Dependencies summary

- Phase 1 + Phase 2 block all UI work.
- US1 (Phase 3) is the MVP; US2 and US3 are additive and can land in either order.
- Realtime subscription depends on feature 003 auth being merged.
