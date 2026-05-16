# Implementation Plan: Multiple-Choice Quiz Mode

**Branch**: `005-mcq-mode` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)

## Summary

Ship the MCQ practice surface at `/learn/quiz`. A learner picks topic + difficulty + question count, optionally enables a 45-second-per-question timer, answers one question at a time with immediate feedback (correct/incorrect coloring + explanation), and at session end sees a per-domain accuracy breakdown with a "Review missed" CTA into the flashcard mode. Builds on the progress-store adapters shipped by feature 004; adds a domain-breakdown rollup and a timer subsystem keyed off monotonic time (not wall clock).

## Technical Context

**Language**: TypeScript 5.5 + React 18.3
**New deps**: `recharts@^2` (radar/bar chart for results), already-in-tree `framer-motion`
**Env vars**: none new
**Storage**: reuses `lib/progress/store.ts` from feature 004 (guest + Supabase adapters)
**Testing**: vitest for `computeDomainBreakdown`, the timer state machine, and the answer reducer; one Playwright smoke for the timed loop
**Project**: extends `frontend/`

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-First UX | Pass | Four options stack vertically on narrow viewports; tap targets ≥ 44px; timer ring doesn't reflow content. |
| II. Domain-Aligned Content | Pass | Topic filter is per AI-300 domain; the results screen rolls up to the same five domains. |
| III. AI as Authoring Tool | Pass | Explanations live on the bank row; no runtime AI. |
| IV. Secrets Stay Server-Side | Pass | Anon client only. |
| V. Measurable Quality Gates | Pass | SC-003 bounds feedback latency under 250 ms; SC-005 bounds timer drift to ±2 s; SC-006 requires Lighthouse a11y ≥ 90. |

## Project Structure (additions)

```
frontend/
└── src/
    ├── pages/
    │   ├── QuizSelectPage.tsx              # topic + difficulty + count + timer toggle
    │   ├── QuizSessionPage.tsx             # in-session loop (already exists from AZ-104 fork — refactor)
    │   └── QuizResultsPage.tsx             # score + domain breakdown + "Review missed" CTA
    ├── components/
    │   ├── QuizQuestion.tsx                # stem + four options + feedback states
    │   ├── QuizTimerRing.tsx               # SVG ring + monotonic-time hook
    │   ├── DomainBreakdownChart.tsx        # recharts radar; reads { domain, pct, weak } rows
    │   └── ReviewMissedCTA.tsx             # routes to /learn/flashcards with prefilled domain list
    └── lib/
        └── quiz/
            ├── reducer.ts                  # QuizSession state machine
            ├── selection.ts                # bank → ordered question ids per filter
            ├── timer.ts                    # monotonic-time hook (45s default)
            ├── domainBreakdown.ts          # computeDomainBreakdown(answers) → BreakdownRow[]
            └── ratings.ts                  # correct/missed → progress-store update (reuses lib/flashcards/ratings)
```

## Phases

1. **Reuse the progress-store adapters** from feature 004; verify they cover `mode='mcq'` session rows.
2. **Selection + reducer** — pure functions for bank filtering, answer-state transitions.
3. **Timer subsystem** — monotonic-time hook, ring component, deterministic timeout effect.
4. **Question UI + feedback** — options, feedback colors, explanation panel, keyboard A/B/C/D.
5. **Results + domain breakdown** — `computeDomainBreakdown` (already partially exists in `QuizSessionPage.tsx` from the AZ-104 fork — extract + test), radar chart, weak-area flag, "Review missed" wiring.
6. **Tests** — unit on `computeDomainBreakdown`, `selection.ts`, `timer.ts` determinism, `reducer.ts`; component test for the timer ring; Playwright smoke.

## Complexity Tracking

The "Review missed" CTA cross-routes into feature 004 (flashcards) with a domain filter. This is an intentional cross-feature integration captured here, not a violation.

| Decision | Why |
|---|---|
| Recharts over a custom SVG radar | Off-the-shelf accessibility (data-table fallback, focusable axes); ~30 KB gzipped fits the bundle budget. |
| Monotonic-time hook (no `Date.now()`) | SC-005 + spec edge case about timezone/DST mid-session. |
