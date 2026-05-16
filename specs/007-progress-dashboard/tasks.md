# Tasks: Progress Dashboard

**Branch**: `007-progress-dashboard` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Order is dependency-aware. `[P]` = can run in parallel with the previous task.

## Phase 0 — Verify ground state

- **T001** Confirm at least one of features 004 / 005 / 006 has landed so `user_progress` and `sessions` rows actually exist for testing. If empty, seed fixtures during dev.
- **T002** Confirm feature 003 auth provides a session hook. The dashboard works for guests too, but auth-aware pieces (realtime sub) need it.
- **T003** Verify the AI-300 domain list in `exams.config.json` matches the radar's five axes: `mlops-infra`, `ml-lifecycle`, `genaiops-infra`, `genai-quality`, `genai-optimization`.

## Phase 1 — Sessions read adapter (foundational)

- **T010** Create `frontend/src/lib/sessions/types.ts` — `SessionRow` shape mirroring the Supabase `sessions` table.
- **T011** [P] Create `frontend/src/lib/sessions/guestStore.ts` — reads from `ai300game.v1.guest.sessions` and returns `SessionRow[]`.
- **T012** [P] Create `frontend/src/lib/sessions/supabaseStore.ts` — `select * from sessions where user_id = auth.uid()` via the anon client + user JWT; orders by `completed_at desc`.
- **T013** Create `frontend/src/lib/sessions/store.ts` — `useSessionsStore()` selecting the right adapter; exposes `sessions`, `latest`, and a `revalidate()` function.

## Phase 2 — Stats math (foundational, US1+US2+US3 depend on this)

- **T020** Create `frontend/src/lib/stats/thresholds.ts` — constants: `WEAK_THRESHOLD = 0.6`, `MIN_SAMPLES = 5`, `LEVELS = [{level:1,xp:0},{level:2,xp:500},{level:3,xp:2000},{level:4,xp:5000}]`, XP rule constants per FR-014.
- **T021** Create `frontend/src/lib/stats/xp.ts` exporting `computeXP(progressEntries, sessions)` → `totalXP`, and `xpToLevel(total)` → `level`. Implements FR-014 + FR-015.
- **T022** [P] Create `frontend/src/lib/stats/streak.ts` exporting `computeStreak(sessions, today)` → `{ current, longest, activeDates }`. "Day" = local calendar day at session start (FR-013).
- **T023** [P] Create `frontend/src/lib/stats/domainAccuracy.ts` exporting `rollup(progressEntries, bank)` → `DomainAccuracy[]`. Marks `dimmed: true` for domains with `answered < MIN_SAMPLES`.
- **T024** [P] Create `frontend/src/lib/stats/calendar.ts` exporting `bucket(sessions, now)` → 12-week grid; each cell `{ date, sessionCount, totalMinutes, filled }`. Honors local timezone.
- **T025** [P] `frontend/tests/unit/stats-xp.test.ts` — fixtures for each FR-014 rule + every `xpToLevel` boundary.
- **T026** [P] `frontend/tests/unit/stats-streak.test.ts` — current-run, longest-run, today-counts-only-if-played, timezone-crossing session counts to the day it started.
- **T027** [P] `frontend/tests/unit/stats-domainAccuracy.test.ts` — < 5 → dimmed; ≥ 5 → solid; exactly 60% is NOT flagged weak (spec edge case).
- **T028** [P] `frontend/tests/unit/stats-calendar.test.ts` — 12 weeks rendered, only days at-or-after first-ever-session show as "active or inactive" (vs. "before-first-session" inactive).

## Phase 3 — Headline + recent session (US1, P1) 🎯 MVP

- **T030** Create `frontend/src/components/HeadlineStats.tsx` — current streak, XP, level badge, total questions seen, overall accuracy %. Reads from `useProgressStore` and `useSessionsStore`.
- **T031** Create `frontend/src/components/RecentSessionCard.tsx` — most-recent session summary (mode, score, when).
- **T032** Create `frontend/src/components/EmptyState.tsx` — brand-new learner surface: friendly copy, "Start a session" primary CTA into `/learn`.
- **T033** Create `frontend/src/pages/ProgressDashboardPage.tsx` at `/progress` — composes headline + recent + (later) radar + focus areas + calendar. When `progressEntries.length === 0 && sessions.length === 0`, render `<EmptyState />` instead.
- **T034** Wire `<ProgressDashboardPage />` to refresh on the browser `storage` event (for guests) and on a Supabase realtime subscription to `user_progress` + `sessions` (authenticated). Coalesce events to one refresh per 500 ms. SC-002 budget = 5 s.
- **T035** Add `/progress` to the router and to primary navigation.

**Checkpoint**: US1 complete — counters reflect latest activity within 5 s, empty state works.

## Phase 4 — Domain radar + focus areas (US2, P1)

- **T040** Create `frontend/src/components/DomainRadar.tsx` — recharts `RadarChart` with five axes from `domainAccuracy`. Dimmed axes (< MIN_SAMPLES) render as a dashed stroke with reduced opacity + a "Not enough data yet" tooltip.
- **T041** [P] Create `frontend/src/components/FocusAreasList.tsx` — lists every `DomainAccuracy` strictly below 60% with a "Practice this domain" CTA per row that routes to `/learn/quiz?domain=<slug>` (and falls back to `/learn/flashcards?domain=<slug>` for users without enough MCQs).
- **T042** Compose both into `ProgressDashboardPage`.
- **T043** [P] `frontend/tests/components/DomainRadar.test.tsx` — shape markers on weak axes (not color alone); dimmed axes have data-table fallback for screen readers.
- **T044** [P] `frontend/tests/components/FocusAreasList.test.tsx` — only strictly-below-60% domains appear; CTA query string is correct.

**Checkpoint**: US2 complete — weak domains visible at a glance.

## Phase 5 — Activity calendar (US3, P2)

- **T050** Create `frontend/src/components/ActivityCalendar.tsx` — 7 rows × 12 columns grid, one cell per day. Filled when `sessionCount > 0`. Tooltip on tap shows `sessionCount` and `totalMinutes`.
- **T051** Compose into `ProgressDashboardPage` below the radar.
- **T052** [P] `frontend/tests/components/ActivityCalendar.test.tsx` — given 4-of-7 active fixture days, exactly 4 cells filled; tooltip content correct; days before first-ever-session render as inactive (not "missed").

**Checkpoint**: US3 complete — calendar visualizes daily activity.

## Phase 6 — Cross-cutting + Tests

- **T060** Run `pnpm -C frontend test` and `pnpm -C frontend lint`. Resolve.
- **T061** [P] Playwright smoke `frontend/tests/e2e/dashboard-smoke.spec.ts` — open `/progress` for a fixture user with mixed data; verify headline values, weak-domain flag, calendar fills.
- **T062** Lighthouse manual check on `/progress`: Accessibility ≥ 90; keyboard tab order across radar focusable axes, focus-areas CTAs, calendar cells.
- **T063** Verify chart bundle delta: recharts is already loaded by feature 005's results page; the dashboard reuses it. Confirm no double-load.

## Phase 7 — Manual verification

- **T070** `pnpm -C frontend dev`. Complete one MCQ session intentionally scoring < 60% in one domain. Open `/progress`; verify the radar reflects it, the focus-areas list flags it, and the CTA opens a pre-filtered session.
- **T071** Open the dashboard in a second tab, complete a session in the first, confirm the second tab updates within 5 s.
- **T072** Sign out and re-open `/progress` as a guest — confirm the guest dashboard renders from local storage.
- **T073** Verify the empty-state surface for a brand-new browser (clear localStorage; visit `/progress` while signed out).

## Phase 8 — Cleanup

- **T080** Update `specs/007-progress-dashboard/checklists/requirements.md`.
- **T081** If XP/level rules end up needing per-exam tuning, lift `LEVELS` and the XP constants from `thresholds.ts` into `exams.config.json` and update `lib/stats/xp.ts` to read them. Not required for v1.

## Dependencies summary

- Phase 1 + Phase 2 block all UI work.
- US1 (Phase 3) is the MVP; US2 and US3 are additive and can land in either order.
- Realtime subscription depends on feature 003 auth being merged.
