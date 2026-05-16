# Implementation Plan: Spaced Repetition and Daily Review

**Branch**: `008-spaced-repetition` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)

## Summary

Ship the "Daily Review" surface and consolidate the spacing algorithm. Two big pieces: (1) a home-screen CTA that counts due items across all modes and starts a cross-mode session in `next_review`-ascending order, and (2) extracting the SM-2-lite policy from feature 004 into a single canonical implementation at `lib/spacing/`. The daily cap (default 30) protects the streak from "I'm 200 items behind" failure modes; "Review more" lets motivated learners overshoot at the cost of the streak bonus.

## Technical Context

**Language**: TypeScript 5.5 + React 18.3
**New deps**: none
**Env vars**: none new
**Storage**: reads from existing `user_progress` + writes session rows with `mode='daily-review'`
**Testing**: vitest for the spacing math (determinism), due-list builder, session reducer, cap rollover logic
**Project**: extends `frontend/`

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-First UX | Pass | Home CTA above the fold; cross-mode session reuses each mode's native UI. |
| II. Domain-Aligned Content | Pass | Due items come from the same bank rows; weak-domain hand-off uses feature 007's data. |
| III. AI as Authoring Tool | Pass | No runtime AI. |
| IV. Secrets Stay Server-Side | Pass | Anon client only. |
| V. Measurable Quality Gates | Pass | SC-001 bounds CTA latency at 500 ms; SC-002 verifies determinism property; SC-006 Lighthouse a11y ≥ 90. |

## Project Structure (additions)

```
frontend/
└── src/
    ├── pages/
    │   ├── HomePage.tsx                       # add the Daily Review hero (or extend existing)
    │   ├── DailyReviewSessionPage.tsx         # cross-mode loop
    │   └── DailyReviewResultsPage.tsx
    ├── components/
    │   ├── DailyReviewHero.tsx                # home CTA: count + Start
    │   └── DailyReviewItem.tsx                # dispatches to <Flashcard>, <QuizQuestion>, <CodeReviewItem>
    └── lib/
        ├── spacing/
        │   ├── policy.ts                      # canonical SM-2-lite: nextReview(prev, rating, today)
        │   ├── policy.types.ts
        │   └── due.ts                         # listDueItems(progressEntries, today) → DueItem[]
        └── dailyReview/
            ├── reducer.ts                     # session state machine across modes
            ├── selection.ts                   # buildDueSession(due, cap=30) with rollover state
            └── session.ts                     # bridges to existing per-mode rating writers
```

Refactor target (feature 004): `frontend/src/lib/flashcards/ratings.ts` deletes its local SM-2-lite math and imports from `lib/spacing/policy.ts`. Same for the MCQ rating write path in feature 005.

## Phases

1. **Canonical spacing policy** — extract + own SM-2-lite, with property tests for determinism.
2. **Due-list builder** — `listDueItems(progressEntries, today)` ordered by `next_review` ascending.
3. **Daily Review hero on home** — count + CTA; replaces the "no reviews due" empty state when zero.
4. **Cross-mode session loop** — reducer that picks each item's mode and dispatches to that mode's question component. Reuses existing rating writers, not new ones.
5. **Cap + rollover** — default 30, "Review more" extends without awarding the daily-streak bonus (FR-008).
6. **Refactor 004/005** — remove the duplicate spacing math; point at `lib/spacing/policy.ts`.

## Complexity Tracking

The cross-mode session needs to render three different question UIs (`Flashcard`, `QuizQuestion`, `CodeReviewItem`) from a single reducer. We accept a thin per-mode "adapter" — `<DailyReviewItem>` — rather than a generic abstraction.

| Decision | Why |
|---|---|
| Bridge to existing rating writers rather than introducing a new generic one | Each mode's writer encodes mode-specific session-row data; duplicating logic is worse than dispatching. |
| Cap default 30 (FR-007) | Spec assumption; tuned later. |
