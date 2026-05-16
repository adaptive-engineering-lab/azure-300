# Implementation Plan: Progress Dashboard

**Branch**: `007-progress-dashboard` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)

## Summary

A read-only dashboard at `/progress` that summarizes the learner's study state: streak, XP, level, totals, accuracy, a five-axis domain radar, a "Focus areas" list (domains < 60%), and a 12-week activity calendar. Data is derived from `profiles`, `user_progress`, and `sessions` — no new write paths. The dashboard is the place where features 004–006 stop being "modes" and start being "a study coach."

## Technical Context

**Language**: TypeScript 5.5 + React 18.3
**New deps**: reuses `recharts` (added by feature 005)
**Env vars**: none new
**Storage**: read-only across `lib/progress/store.ts` (guest + Supabase adapters) and `lib/sessions/store.ts` (new — sessions read adapter)
**Testing**: vitest for streak math, XP/level mapping, domain-accuracy rollup, calendar bucketing
**Project**: extends `frontend/`

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-First UX | Pass | Single scrollable column on mobile; radar resizes; calendar rows wrap. |
| II. Domain-Aligned Content | Pass | Five-axis radar mirrors AI-300 domains from `exams.config.json`. |
| III. AI as Authoring Tool | Pass | No runtime AI. |
| IV. Secrets Stay Server-Side | Pass | Anon client only. |
| V. Measurable Quality Gates | Pass | SC-001 bounds render time; SC-006 requires Lighthouse a11y ≥ 90; radar uses shape+position cues (FR-016) not color alone. |

## Project Structure (additions)

```
frontend/
└── src/
    ├── pages/
    │   └── ProgressDashboardPage.tsx
    ├── components/
    │   ├── HeadlineStats.tsx                # streak / XP / level / totals row
    │   ├── DomainRadar.tsx                  # 5-axis radar; reuses recharts
    │   ├── FocusAreasList.tsx               # weak domains + CTA per
    │   ├── ActivityCalendar.tsx             # 12-week grid; tooltip per filled day
    │   ├── RecentSessionCard.tsx            # most-recent session summary
    │   └── EmptyState.tsx                   # brand-new learner surface
    └── lib/
        ├── sessions/
        │   ├── store.ts                     # useSessionsStore() picks adapter
        │   ├── guestStore.ts                # localStorage.ai300game.v1.guest.sessions
        │   └── supabaseStore.ts             # select from sessions
        └── stats/
            ├── streak.ts                    # computeStreak(sessions, today) → { current, longest, activeDates }
            ├── xp.ts                        # computeXP(progressEntries, sessions) → totalXP; xpToLevel(total) → level
            ├── domainAccuracy.ts            # rollup(progressEntries, bank) → DomainAccuracy[]
            ├── useDomainAccuracy.ts         # hook wrapper consumed by 007 components + feature 008
            ├── calendar.ts                  # bucket(sessions) → 12-week grid
            └── thresholds.ts                # constants: WEAK_THRESHOLD=0.6, MIN_SAMPLES=5, LEVELS
```

## Phases

1. **Sessions read adapter** — guest + Supabase. Read-only; this feature does not write sessions.
2. **Stats math** — pure functions for streak, XP/level, domain accuracy, calendar buckets. All unit-tested against fixtures.
3. **Dashboard components** — headline row, radar, focus areas, calendar, recent session, empty state.
4. **Wiring** — `ProgressDashboardPage` composes the components; auto-refresh on cross-tab `storage` events for guests and a Supabase realtime subscription for authenticated learners (FR-008 5 s budget).
5. **Tests** — comprehensive unit tests for the stats math (the threshold edge cases, timezone, empty state).

## Complexity Tracking

XP and level rules live here for now (`lib/stats/thresholds.ts`). When feature 008 (spaced repetition) lands, it shares the same constants; if the rules ever change per exam, move them to `exams.config.json`.

| Decision | Why |
|---|---|
| Supabase realtime for authenticated update propagation | FR-008 bounds cross-tab freshness at 5 s; postgres `LISTEN/NOTIFY` via supabase-js is the cheap path. |
| Calendar window fixed at 12 weeks | Spec assumption; longer-history views deferred. |
