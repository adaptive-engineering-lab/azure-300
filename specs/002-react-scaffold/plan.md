# Implementation Plan: React Scaffold, Routing, and Guest Progress Store

**Branch**: `002-react-scaffold` | **Date**: 2026-05-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-react-scaffold/spec.md`

## Summary

Stand up the entire React frontend skeleton: Vite + TypeScript build, Tailwind + shadcn/ui styling, React Router v6 navigation across `/`, `/learn`, `/learn/{flashcards|quiz|code-review}`, `/progress`, `/settings`, and a Zustand state store whose progress and session shapes mirror feature 001's authenticated tables for clean future migration. State persists to `localStorage` under a versioned, namespaced key. Dark mode is the default with a FOUC-free apply pass. Mode routes render "coming soon" placeholders that explain the future modes without crashing. No Supabase reads or writes in this feature — that arrives with feature 003.

## Technical Context

**Language/Version**: TypeScript 5.5 + React 18.3 (per constitution Technology Constraints)
**Primary Dependencies**: `react`, `react-dom`, `react-router-dom@6`, `zustand@4`, `tailwindcss@3`, `framer-motion`, plus shadcn/ui components copied into the repo. Build: `vite@5`. Lint: existing repo-level eslint + prettier.
**Storage**: Browser `localStorage` for guest state. No backend reads or writes in this feature.
**Testing**: `vitest` for unit tests of store + storage logic; `@testing-library/react` + `jsdom` for component / routing tests. No Playwright in this feature — full E2E lands when there's a real flow to test (feature 004 onward).
**Target Platform**: Modern evergreen browsers; mobile-first from 375px down to 320px. Static deploy target (Vercel or Azure Static Web Apps per constitution).
**Project Type**: Web application — adds a new `frontend/` package alongside the existing `tools/` package, both pnpm-managed but not joined by a workspace tool.
**Performance Goals**: Home (`/`) interactive in <2s on mid-range mobile + 4G (SC-001); initial JS bundle under 250 KB gzipped (FR-014); localStorage round-trip under 50ms p95 (SC-003).
**Constraints**: Lighthouse Performance/Accessibility/Best-Practices/SEO ≥ 90 on `/` (SC-002, constitution Principle V); WCAG 2.1 AA contrast on the shell; FOUC-free theme apply; works with localStorage disabled (FR-012, SC-006); guest progress shape MUST match feature 001's authenticated tables (FR-009, FR-010).
**Scale/Scope**: Static-asset frontend; per-browser state bounded by localStorage quota (~5 MB typical, plenty for ~10k progress entries).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Status | Notes |
|---|---|---|---|
| I. Mobile-First, Thumb-Friendly UX | Yes — core | Pass | Spec FR-005 / FR-006 / FR-007 enforce 375px width, thumb-zone controls, dark default. Plan honors all three. |
| II. Domain-Aligned Content Integrity | No | N/A | This feature ships no content. The bank is read in feature 004; the seed file's domain whitelist remains the integrity boundary. |
| III. AI as Authoring Tool, Not Runtime | Yes | Pass | No runtime AI calls anywhere in this feature. No Anthropic, no edge function, no streaming endpoint. |
| IV. Secrets Stay Server-Side | Yes | Pass | No Supabase credentials in scope — no client uses keys yet. Future features will add the `anon` key; this feature's static config carries zero secrets. |
| V. Measurable Quality Gates | Yes — core | Pass | Spec SC-002 (Lighthouse ≥ 90 on `/`) is a merge gate enforced by feature 012 once it lands; spec FR-014 (250 KB gzipped initial bundle) is a hard budget verified in Phase 1's contracts. |

**Result**: No violations. Proceeding to Phase 0.

**Post-design re-check (after Phase 1)**: No design choices conflict with any principle. The Zustand + persisted-localStorage approach in `research.md` keeps the entire state engine in-browser, reinforcing Principle IV. The route-level placeholders avoid premature commitment to per-mode implementation (Principle I & V remain enforced once those modes ship).

## Project Structure

### Documentation (this feature)

```text
specs/002-react-scaffold/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (in-browser state shapes)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── routes.md
│   ├── storage-namespace.md
│   └── theme-tokens.md
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.cjs
├── postcss.config.cjs
├── public/
│   └── icon.svg
└── src/
    ├── main.tsx               # entry; mounts <App />
    ├── App.tsx                # router config, providers
    ├── index.css              # tailwind base/components/utilities + tokens
    ├── lib/
    │   ├── routes.ts          # canonical route paths (single source of truth)
    │   ├── store/
    │   │   ├── index.ts       # createStore + slices wiring
    │   │   ├── preferences.ts # SessionPreferences slice
    │   │   ├── profile.ts     # GuestProfile slice
    │   │   ├── progress.ts    # GuestProgress slice (mirror shape)
    │   │   └── sessions.ts    # GuestSession slice (mirror shape)
    │   ├── storage/
    │   │   ├── adapter.ts     # storage abstraction (localStorage OR session-only memory)
    │   │   ├── namespace.ts   # `ai300game.v1.*` prefix; version constant
    │   │   ├── migrate.ts     # version-to-version migrators
    │   │   └── available.ts   # detect localStorage availability
    │   ├── theme/
    │   │   ├── apply-theme.ts # runs before React paints; reads pref synchronously
    │   │   └── ThemeProvider.tsx
    │   └── shape/
    │       └── compat.ts      # type-level + runtime checks vs feature 001 schemas
    ├── pages/
    │   ├── HomePage.tsx
    │   ├── LearnIndexPage.tsx
    │   ├── FlashcardsPlaceholderPage.tsx
    │   ├── QuizPlaceholderPage.tsx
    │   ├── CodeReviewPlaceholderPage.tsx
    │   ├── ProgressPage.tsx
    │   └── SettingsPage.tsx
    └── components/
        ├── ui/                # shadcn components copied here
        ├── AppShell.tsx       # nav + <Outlet />
        ├── StreakBadge.tsx
        ├── XpBadge.tsx
        ├── ModeCard.tsx
        └── PrivateModeWarning.tsx

frontend/tests/
├── unit/
│   ├── storage-adapter.test.ts        # FR-011, FR-012, FR-013
│   ├── namespace.test.ts              # FR-011 key prefix
│   ├── migrate.test.ts                # FR-013 schema versioning
│   ├── store-progress.test.ts         # FR-008 writes + reads
│   └── shape-compat.test.ts           # FR-009/FR-010 / SC-005 — shape parity vs feature 001
└── component/
    ├── routing.test.tsx               # FR-002/FR-004/FR-015 — every route renders + deep links
    ├── theme-fouc.test.tsx            # SC-004 — no flash of wrong theme
    └── shell-a11y.test.tsx            # FR-016 / SC-006 — basic axe-core pass
```

**Structure Decision**: A new top-level `frontend/` package, peer to the existing `tools/`. No workspace tool (pnpm-workspaces, Turbo, Nx) — the two packages have non-overlapping deps, separate test runners, and entirely separate build outputs. Adding a workspace tool now buys nothing and slows iteration; it can be introduced later if 3+ packages emerge.

## Complexity Tracking

> No constitution-check violations. Table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
