# Implementation Plan: Flashcard Mode

**Branch**: `004-flashcard-mode` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)

## Summary

Ship the static (no-AI) flashcard study mode at `/learn/flashcards`. A learner picks a topic and session length, flips through cards, self-rates each one, and the rating is written back to the progress store (local for guests, Supabase for authenticated learners). Due-cards-first ordering is read here from the spaced-repetition fields that already live on each progress row. The flashcard mode is the first non-trivial read path through the bank and the first write path through the progress store.

## Technical Context

**Language**: TypeScript 5.5 + React 18.3
**New deps**: `framer-motion@^11` (flip animation), `react-swipeable@^7` (mobile gestures)
**Env vars**: none new
**Storage**: localStorage namespace `ai300game.v1.guest` for guests; Supabase tables `user_progress` / `sessions` for authenticated learners (FK to `auth.users`)
**Testing**: vitest + jsdom for the session reducer, ordering, and SM-2-lite math; one Playwright smoke for the swipe → rate → results loop
**Project**: extends `frontend/`; no new package

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-First UX | Pass | Swipe gestures + on-screen buttons; rating controls in lower band; flip animation respects `prefers-reduced-motion`. |
| II. Domain-Aligned Content | Pass | Topic picker derives from AI-300 domains via `exams.config.json`; "random mix" unions all five domains. |
| III. AI as Authoring Tool | Pass | No runtime AI call. Cards are read straight from the seeded bank. |
| IV. Secrets Stay Server-Side | Pass | Uses the `anon` Supabase client only; the guest path touches no Supabase at all. |
| V. Measurable Quality Gates | Pass | SC-005 budgets the route bundle (<100 KB gzipped delta); SC-006 requires Lighthouse a11y ≥ 90; SC-003 bounds flip animation under 400 ms. |

## Project Structure (additions)

```
frontend/
└── src/
    ├── pages/
    │   ├── FlashcardSelectPage.tsx       # topic + length picker
    │   └── FlashcardSessionPage.tsx      # in-session loop
    ├── components/
    │   ├── Flashcard.tsx                 # the flippable card (front/back/animation)
    │   ├── RatingControls.tsx            # got-it / almost / missed buttons
    │   ├── FlashcardSessionProgress.tsx  # "3 / 20" bar + streak/XP indicators
    │   └── FlashcardResultsPanel.tsx     # end-of-session summary
    └── lib/
        ├── flashcards/
        │   ├── session.ts                # selectCardsForSession(topic, length, progress) → CardOrder
        │   ├── ordering.ts               # due-first interleave + random-within-group
        │   ├── reducer.ts                # FlashcardSession state machine
        │   └── ratings.ts                # rating → progress-store update (delegates to lib/progress)
        └── progress/
            ├── store.ts                  # unified read/write across guest + authenticated
            ├── guestStore.ts             # localStorage adapter
            └── supabaseStore.ts          # Supabase adapter (uses lib/auth session)
```

## Phases

1. **Data adapters** — `lib/progress/store.ts` plus the two backing adapters (`guestStore`, `supabaseStore`); pure functions tested in isolation.
2. **Session math** — `lib/flashcards/session.ts`, `ordering.ts`, `ratings.ts`; SM-2-lite interval logic (mirrors feature 008's algorithm — own it here, refactor when 008 lands).
3. **UI** — `Flashcard`, `RatingControls`, session/results pages; wire swipe gestures + reduced-motion handling.
4. **Routing** — add `/learn` index entry + `/learn/flashcards/*` subroutes.
5. **Tests** — unit on `session.ts` + `ordering.ts` + `ratings.ts`; component test for `<Flashcard>` flip + a11y; one Playwright smoke.

## Complexity Tracking

The SM-2-lite policy will be duplicated by feature 008 ("Spaced Repetition") at the platform level. We accept the temporary duplication so feature 004 can ship standalone; refactor when 008 lands.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Spacing logic lives in `lib/flashcards/ratings.ts` and (later) `lib/spacing/` | Feature 004 ships before 008; needs a working interval calc to write `next_review` | Waiting for 008 stalls the demoable MVP. |
