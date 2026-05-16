# Implementation Plan: Code Review Mode

**Branch**: `006-code-review-mode` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)

## Summary

Ship the Code Review study mode at `/learn/code-review`. A learner picks a difficulty / sub-mode / session length, sees one syntax-highlighted code snippet at a time, picks one of four options, and gets immediate feedback with a plain-English explanation. Three sub-modes share one component: `find-the-bug`, `what-does-this-do`, and `fill-the-blank`. The mode replaces the earlier `product-id` proposal — AI-300 has thin product breadth but deep tool surface area, so snippet-based scenario questions are a better fit than name-to-category drills.

This feature introduces a new `questions.type='code-review'` row shape, a new schema contract, a one-line migration to the `questions_type_chk` constraint, and a syntax-highlighting dependency on the client.

## Technical Context

**Language**: TypeScript 5.5 + React 18.3
**New deps**: `shiki@^1` for syntax highlighting (smaller and more themable than Prism; ships with the One Dark theme out of the box). Lazy-loaded so it doesn't bloat the home-route bundle.
**Env vars**: none new
**Storage**: reuses `lib/progress/store.ts` from feature 004 (guest + Supabase). New per-session resume state lives under `ai300game.v1.<scope>.code-review-session` for FR-011.
**Testing**: vitest on selection, blank-placeholder rendering, the session reducer, schema validation; one Playwright smoke for a 5-item session covering all three sub-modes.
**Project**: extends `frontend/`. Adds one Supabase migration; updates feature 001's contracts and seed-CLI schema map; updates feature 009's authoring tool to handle the new type.

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-First UX | Pass | Code block scrolls horizontally inside its container (FR-014); options stay below; tap targets ≥ 44 px. |
| II. Domain-Aligned Content | Pass | Items tagged with one of the five AI-300 domains; `topic` from the canonical topics list in `exams.config.json`. |
| III. AI as Authoring Tool | Pass | Snippets are pre-authored via feature 009 + human review. No runtime AI; the explanation is part of the seeded row. |
| IV. Secrets Stay Server-Side | Pass | Anon client only. |
| V. Measurable Quality Gates | Pass | SC-003 budgets syntax highlighting at < 300 ms; SC-006 requires Lighthouse a11y ≥ 90; SC-007 verifies no horizontal page scroll on 375 px viewport. |

## Project Structure (additions)

```
frontend/
└── src/
    ├── pages/
    │   ├── CodeReviewSelectPage.tsx                  # sub-mode + difficulty + length picker
    │   ├── CodeReviewSessionPage.tsx                 # in-session loop
    │   └── CodeReviewResultsPage.tsx
    ├── components/
    │   ├── CodeReviewItem.tsx                        # one rendered item (snippet + prompt + 4 options)
    │   ├── CodeSnippet.tsx                           # shiki-backed renderer; handles ___BLANK___
    │   ├── BlankPlaceholder.tsx                      # the visually distinct inline pill
    │   ├── LanguageBadge.tsx                         # "Python" / "YAML" / "Bash" label
    │   └── MissedItemsList.tsx                       # results-screen review list
    └── lib/
        └── codeReview/
            ├── types.ts                              # CodeReviewItem, CodeReviewSession, SubMode, Language
            ├── selection.ts                          # selectItems({ subMode, difficulty, count, bank })
            ├── reducer.ts                            # idle | answering | revealed | finished
            ├── snippet.ts                            # tokenize + insert blank pill
            ├── shiki.ts                              # lazy-loaded highlighter singleton
            └── resume.ts                             # localStorage resume snapshot for FR-011

contracts/                                            # (created by feature 001)
└── code-review.schema.json                           # full schema from spec; loaded by ajv

supabase/migrations/
└── 0014_code_review_type.sql                         # drop + recreate questions_type_chk

tools/author/
├── src/claude/prompts/draft-code-review.ts          # added in feature 009 to support this type
└── prompts/code-review.md                           # the authoring addendum (this PR ships it)
```

## Phases

1. **Schema + migration** — `code-review.schema.json` (committed under `contracts/`), the Supabase migration replacing the type-check constraint, the seed-CLI schema map updated.
2. **Selection + reducer** — pure functions for bank filtering + session state machine.
3. **Snippet rendering** — `shiki` lazy-loaded; `BlankPlaceholder` component for `___BLANK___`; `LanguageBadge` for the language label.
4. **US1: find-the-bug session loop** — `CodeReviewSelectPage` + `CodeReviewSessionPage` + `CodeReviewResultsPage`. Progress writes, sessions row, missed-items panel.
5. **US2: what-does-this-do** — same component, sub-mode-aware prompt copy and badge label.
6. **US3: fill-the-blank** — snippet renderer special-cases `___BLANK___`; on reveal, the placeholder pill is replaced with the correct value styled to match.
7. **Session resume** — persist `CodeReviewSession` to localStorage after each answer; restore on route mount if present and not stale (> 24 h).
8. **Authoring tool integration** — feature 009's `draft` subcommand learns about `--type=code-review`, including the new prompt template that lives at `tools/author/prompts/code-review.md`.
9. **Tests + Lighthouse + bundle**.

## Complexity Tracking

The bundle cost of `shiki` is the main concern. Naïve import pulls every grammar and theme; we use the `getHighlighter({ langs, themes })` shape and lazy-load on first session navigation.

| Decision | Why |
|---|---|
| `shiki` over Prism | Better dark-theme defaults, more accurate highlighting for YAML + Python; tree-shakeable grammars. |
| Lazy-load the highlighter | Keep home / `/learn` route bundles unaffected; first nav to `/learn/code-review` pays the cost. |
| Resume snapshot in localStorage even for authenticated users | FR-011 + spec edge case (mid-session navigation). Authenticated learners get the same resume; on session completion the snapshot is cleared and the `sessions` row is the durable record. |
| New migration on the `questions_type_chk` constraint | The constraint hardcodes the type list; adding `'code-review'` requires `drop + recreate`. Captured in 0014. |

## Cross-feature coordination

- **Feature 001** (schema/seed): the new `code-review.schema.json` lives under `contracts/`; the seed CLI's schema map needs an entry. Coordinate that PR with this one.
- **Feature 008** (spaced repetition): the cross-mode Daily Review session needs to know about `mode='code-review'` to dispatch the right component. Update feature 008's `DailyReviewItem` dispatcher.
- **Feature 009** (authoring): add `--type=code-review` support; commit the prompt addendum at `tools/author/prompts/code-review.md`.
- **`exams.config.json`**: `questionTargets.byType['product-id']` becomes `code-review`; `gameModes.productId` becomes `gameModes.codeReview` (set to `true` for AI-300).
