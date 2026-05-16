---
description: "Task list for React Scaffold, Routing, and Guest Progress Store"
---

# Tasks: React Scaffold, Routing, and Guest Progress Store

**Input**: Design documents from `/specs/002-react-scaffold/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — plan.md lists 8 test files (5 unit + 3 component) and the spec treats Lighthouse a11y/bundle budgets as merge gates. TDD order is enforced within each user story.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. US1 (P1) delivers the navigable shell (MVP). US2 (P2) adds persistence + FOUC-free theme. US3 (P3) locks the guest shape to feature 001's authenticated tables.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different file, no dependency on incomplete tasks — safe to run in parallel.
- **[Story]**: Maps to spec.md user stories (US1, US2, US3).

## Path Conventions

Per plan.md → Project Structure (web app, new `frontend/` package peer to `tools/`):

- App code: `frontend/src/`
- Tests: `frontend/tests/unit/` and `frontend/tests/component/`
- Config: `frontend/` (vite, tailwind, tsconfig)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up the `frontend/` package alongside `tools/`. No story-specific work yet.

- [ ] T001 Create `frontend/package.json` with name `ai300-game-frontend`, `"type": "module"`, deps `react@^18.3`, `react-dom@^18.3`, `react-router-dom@^6.26`, `zustand@^4.5`, `framer-motion@^11`, devDeps `vite@^5`, `@vitejs/plugin-react@^4`, `typescript@^5.5`, `@types/react`, `@types/react-dom`, `tailwindcss@^3.4`, `postcss`, `autoprefixer`, `vitest@^2`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@axe-core/playwright` (deferred — placeholder), `axe-core`
- [ ] T002 [P] Create `frontend/vite.config.ts` — `defineConfig({ plugins: [react()], test: { environment: 'jsdom', setupFiles: 'tests/setup.ts', globals: true } })`. Set `build.rollupOptions.output.manualChunks` to split vendor (react, react-router-dom, framer-motion) from app code so the home-route bundle stays under the 250 KB gzipped budget (FR-014).
- [ ] T003 [P] Create `frontend/tsconfig.json` (target `ES2022`, JSX `react-jsx`, strict, `paths: { '@/*': ['./src/*'] }`) and `frontend/tsconfig.node.json` (for the vite.config import).
- [ ] T004 [P] Create `frontend/tailwind.config.cjs` and `frontend/postcss.config.cjs` per `contracts/theme-tokens.md`. Tailwind `content` covers `index.html` + `src/**/*.{ts,tsx}`. `darkMode: 'class'`. Map `colors.bg`, `colors.fg`, `colors.accent`, etc. to `hsl(var(--color-*) / <alpha-value>)`.
- [ ] T005 [P] Create `frontend/index.html` with `<html lang="en">`, viewport meta (`width=device-width, initial-scale=1, viewport-fit=cover`), `<div id="root">`, and the FOUC-prevention inline `<script>` block specified in `contracts/theme-tokens.md` § "Application timing".
- [ ] T006 [P] Create `frontend/public/icon.svg` — a minimal mark for browser favicon + future PWA. SVG, no PNG yet.
- [ ] T007 Create `frontend/tests/setup.ts` — registers `@testing-library/jest-dom` matchers and `cleanup()` after each test.
- [ ] T008 Add npm scripts to `frontend/package.json`: `"dev": "vite"`, `"build": "tsc && vite build"`, `"preview": "vite preview"`, `"test": "vitest run"`, `"test:watch": "vitest"`, `"lint": "eslint ."`. Inherit ESLint config from `tools/eslint.config.js` via a re-export or copy.
- [ ] T009 [P] Add `frontend/` entries to the repo root `.gitignore`: `frontend/node_modules`, `frontend/dist`, `frontend/.vite`.
- [ ] T010 Run `pnpm -C frontend install`; verify `vite --version` succeeds.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Storage adapter + theme apply + routes manifest + shape-compat module. These are imported by every user-story phase, so they must land first.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T011 [P] Create `frontend/src/lib/routes.ts` exporting the canonical `ROUTES` map per `contracts/routes.md` § "Path set" (`/`, `/learn`, `/learn/flashcards`, `/learn/quiz`, `/learn/code-review`, `/progress`, `/settings`). All values are string literals; no template paths.
- [ ] T012 [P] Create `frontend/src/lib/storage/namespace.ts` exporting `KEY = 'ai300game.v1.state'`, `PROBE_KEY = 'ai300game.probe'`, and `CURRENT_VERSION = 1`.
- [ ] T013 [P] Create `frontend/src/lib/storage/available.ts` exporting `detectLocalStorage()` that runs the sentinel write/read described in `contracts/storage-namespace.md` § "Availability detection". Returns `true | false`; deletes the probe key after the test, success or fail; never throws.
- [ ] T014 [P] Create `frontend/src/lib/storage/migrate.ts` exporting `MIGRATORS: Record<number, (input: any) => any>` (empty for now; v2 onward gets appended), `migrate(parsed)` that runs migrators in ascending version order until `__version === CURRENT_VERSION`, and the downgrade behavior (`__version > CURRENT_VERSION` → clear + return defaults).
- [ ] T015 Create `frontend/src/lib/storage/adapter.ts` exporting `storage` — an object conforming to a tiny Web Storage subset (`getItem`, `setItem`, `removeItem`). Backed by `window.localStorage` when `detectLocalStorage()` is `true`; otherwise an in-memory `Map`. Wraps `setItem` in a try/catch that calls a registered `onQuotaExceeded(prune)` callback per `contracts/storage-namespace.md` § "Quota handling". Synchronous (matches the Web Storage API).
- [ ] T016 [P] Create `frontend/src/lib/theme/apply-theme.ts` exporting `applyTheme(theme: 'dark' | 'light')` that toggles `document.documentElement.classList`. Re-usable by both the inline `<script>` in index.html (compiled inline) and the React `ThemeProvider`.
- [ ] T017 [P] Create `frontend/src/lib/shape/compat.ts` — type-level utility `AssertEqual<A, B>` that fails at compile time if two types diverge. Exports declared comparisons between `GuestProgress` and the `user_progress` row shape from feature 001 (less `user_id`), and between `GuestSession` and `sessions` (less `user_id`). Imports the authenticated types from a new file `frontend/src/lib/shape/feature001.types.ts` that copies the relevant `interface` declarations from `specs/001-supabase-schema-and-seed/data-model.md` so the comparison is local and self-contained.
- [ ] T018 [P] Create `frontend/src/index.css` — Tailwind base/components/utilities directives + the two token blocks (`:root` for light, `html.dark` for dark) verbatim from `contracts/theme-tokens.md`. Body sets `bg-bg text-fg font-sans antialiased`.
- [ ] T019 [P] Create `frontend/tests/unit/namespace.test.ts` (FR-011): asserts the namespace constants, the `ai300game.*` prefix, and that no other key the app writes escapes the prefix (regex pass over the source).
- [ ] T020 [P] Create `frontend/tests/unit/storage-adapter.test.ts` (FR-011, FR-012, FR-013): with a mocked `localStorage`, exercise `getItem`, `setItem`, `removeItem`; with `setItem` throwing `QuotaExceededError`, the registered prune callback fires; when `detectLocalStorage()` returns `false`, the adapter uses the in-memory `Map` and never touches `window.localStorage`.
- [ ] T021 [P] Create `frontend/tests/unit/migrate.test.ts` (FR-013): empty migrator set returns the input unchanged when `__version === 1`; a future v2 migrator runs once and only once; downgrade (`__version > CURRENT_VERSION`) returns `null` (signal to clear + reinit).

**Checkpoint**: Foundation ready — user-story implementation can begin in parallel.

---

## Phase 3: User Story 1 — Anyone Can Open the App and Navigate Around (Priority: P1) 🎯 MVP

**Goal**: A first-time visitor opens the app on a phone-sized viewport and can reach every route (`/`, `/learn`, `/learn/{flashcards|quiz|code-review}`, `/progress`, `/settings`) without errors. Mobile-first layout. Primary CTA on `/` lives in the bottom 60% of the viewport.

**Independent Test**: On a 375px-wide viewport, open `/`. Verify the home screen renders with product name + one-sentence value statement + streak/XP zero-state + primary CTA in the bottom 60%. Tap the CTA → land on `/learn` with three `ModeCard`s. Direct-navigate to each `/learn/*` placeholder URL → renders the "coming soon" surface. Browser back/forward works. Verified by `tests/component/routing.test.tsx`.

### Tests for User Story 1 (write first, ensure they FAIL before T038–T047 land)

- [ ] T030 [P] [US1] Create `frontend/tests/component/routing.test.tsx` (FR-002, FR-004, FR-015): for each route in `ROUTES`, mount `<App>` with `MemoryRouter initialEntries={[path]}`; assert the expected page component renders (data-testid match) and no console error fires. Cover browser back/forward via `history.back()` after a programmatic navigation.

### Implementation for User Story 1

- [ ] T031 [P] [US1] Create `frontend/src/main.tsx` — mounts `<App />` into `#root` with React 18 `createRoot`. Imports `./index.css`.
- [ ] T032 [P] [US1] Create `frontend/src/App.tsx` — wraps `<BrowserRouter>` around a `<Routes>` config that imports each page via `React.lazy()` for route-level code-splitting. Mounts `<AppShell>` as the layout element so all routes share the nav surface.
- [ ] T033 [P] [US1] Create `frontend/src/components/AppShell.tsx` — top-level layout that renders the nav + `<Outlet />`. Mobile-first: nav is a bottom tab bar on viewports < 768px, top bar on ≥ 768px. Active tab reflects current route (FR-004). Each tab is ≥ 44px tap target (resolved decision #5).
- [ ] T034 [P] [US1] Create `frontend/src/components/StreakBadge.tsx` — reads `profile.streakDays` from the store (defaulting to 0); renders "🔥 N day streak" or "Start a streak today" if 0. Pure display; no writes.
- [ ] T035 [P] [US1] Create `frontend/src/components/XpBadge.tsx` — reads `profile.xp` and `profile.level`; renders "Lv N · X XP". Pure display.
- [ ] T036 [P] [US1] Create `frontend/src/components/ModeCard.tsx` — accepts `{ title, summary, href, status }`; renders a tappable card linking to `href`. Status `'placeholder'` shows a "Coming soon" pill.
- [ ] T037 [P] [US1] Create `frontend/src/pages/HomePage.tsx` — `<h1>` product name, one-sentence value statement, `<StreakBadge>` + `<XpBadge>` at the top, primary CTA "Start learning" linking to `/learn` positioned in the bottom 60% of the viewport via flex layout with `mt-auto` (FR-006). Min-width-safe at 320px (FR-005).
- [ ] T038 [P] [US1] Create `frontend/src/pages/LearnIndexPage.tsx` — renders three `<ModeCard>`s: Flashcards, MCQ Quiz, Code Review. Each card links to its `/learn/*` route. Title at top; cards stacked vertically on narrow, 2-up grid on ≥ 640px.
- [ ] T039 [P] [US1] Create `frontend/src/pages/FlashcardsPlaceholderPage.tsx` — "Coming soon" copy explaining the future flashcard mode (sourced from feature 004's spec summary). Includes a CTA back to `/learn`.
- [ ] T040 [P] [US1] Create `frontend/src/pages/QuizPlaceholderPage.tsx` — same shape as T039, for MCQ.
- [ ] T041 [P] [US1] Create `frontend/src/pages/CodeReviewPlaceholderPage.tsx` — same shape, for code-review. Replaces the old `ProductIdPlaceholderPage` per feature 006's redesign.
- [ ] T042 [P] [US1] Create `frontend/src/pages/ProgressPage.tsx` — zero-state surface only. "No activity yet — start a session to begin tracking" + a CTA to `/learn`. No reads of `progress` slice yet (that's US2's job).
- [ ] T043 [P] [US1] Create `frontend/src/pages/SettingsPage.tsx` — empty state with a placeholder "Settings will appear here once the app has activity to configure." (Real controls land in US2 via theme toggle, and in feature 003 via sign-in.)
- [ ] T044 [US1] Run `pnpm -C frontend dev`; navigate manually to every route from `ROUTES`; verify all render without console errors. Capture a screenshot of each route into `frontend/tests/_screenshots/` (commit only if a CI visual regression flow exists; otherwise local only).

**Checkpoint**: US1 complete — the navigable shell is demoable. MVP can be shown to a stakeholder. Streak/XP show zero state because no game-mode features write yet.

---

## Phase 4: User Story 2 — A Returning Visitor's Preferences and Stats Persist (Priority: P2)

**Goal**: All four state slices (`preferences`, `profile`, `progress`, `sessions`) persist to localStorage under `ai300game.v1.state`; theme survives a reload with no FOUC; missing-localStorage browsers fall through to in-memory state with a one-time dismissible notice.

**Independent Test**: Set the theme to light in `/settings`. Reload. Verify the page renders in light mode with no visible flash of dark first. Inspect localStorage and find the persisted JSON. Disable localStorage in DevTools, reload — page works, banner shows, no console errors. Verified by `tests/component/theme-fouc.test.tsx` + `tests/unit/store-progress.test.ts`.

### Tests for User Story 2

- [ ] T050 [P] [US2] Create `frontend/tests/component/theme-fouc.test.tsx` (SC-004): assert the inlined index.html `<script>` block sets `documentElement.classList.add('dark')` before the React bundle parses. Use `jsdom` to evaluate the inline script and assert the class is on the html element before `<App>` renders.
- [ ] T051 [P] [US2] Create `frontend/tests/unit/store-progress.test.ts` (FR-008): create a fresh store, dispatch a synthetic progress upsert (`upsertProgress({ questionId, rating: 'correct' })`), assert the new entry is in the `progress` map with the right `timesSeen`/`timesCorrect`/`lastRating`. Force the persist middleware to flush; assert the JSON shape in the mocked `storage` matches `PersistedState`.

### Implementation for User Story 2

- [ ] T052 [P] [US2] Create `frontend/src/lib/store/preferences.ts` — Zustand slice for `SessionPreferences` with defaults from `data-model.md` § "Slice 1" and validators that coerce out-of-range values on read.
- [ ] T053 [P] [US2] Create `frontend/src/lib/store/profile.ts` — Zustand slice for `GuestProfile` with the streak/XP/level rules. Exposes a derived `level` getter computed from `xp` per the boundaries in data-model.md.
- [ ] T054 [P] [US2] Create `frontend/src/lib/store/progress.ts` — Zustand slice exposing `upsertProgress(questionId, partial)`, `getProgress(questionId)`, `bulkRead()`. Enforces the validation rules (`timesCorrect <= timesSeen`, `lastRating ∈ enum | null`).
- [ ] T055 [P] [US2] Create `frontend/src/lib/store/sessions.ts` — Zustand slice for the chronological session list. Capped at 500 entries with FIFO eviction. Exposes `recordSession(session)`, `recent(n)`.
- [ ] T056 [US2] Create `frontend/src/lib/store/index.ts` — composes all four slices via Zustand's `combine`. Wraps with the `persist` middleware pointed at the `storage` adapter from T015, key `KEY` (=`ai300game.v1.state`), `version: CURRENT_VERSION`, and `migrate: migrate` from T014. Exposes `useStore` hook.
- [ ] T057 [US2] Create `frontend/src/lib/theme/ThemeProvider.tsx` — reads `preferences.theme` from the store; on mount, calls `applyTheme(theme)`; on theme changes, re-applies. Wraps `<App>`'s children.
- [ ] T058 [US2] Update `frontend/src/pages/SettingsPage.tsx` (was placeholder in US1) to render a theme toggle (Dark / Light) and a session-length picker (10 / 20 / 30) that read+write the `preferences` slice. Both controls are keyboard-accessible and meet 44px tap targets.
- [ ] T059 [US2] Update `frontend/src/components/StreakBadge.tsx` and `XpBadge.tsx` to actually read from `useStore()` (in US1 they were placeholder zero-state).
- [ ] T060 [P] [US2] Create `frontend/src/components/PrivateModeWarning.tsx` — non-blocking dismissible banner shown once when `detectLocalStorage()` returns `false`. Dismissal state lives in memory only (resurfaces next visit until storage works).
- [ ] T061 [US2] Wire `<PrivateModeWarning>` into `<AppShell>` above the nav (mobile) or at the top (desktop). Mounts only when storage is unavailable (FR-012).
- [ ] T062 [US2] Register the quota-exceeded prune callback in `frontend/src/lib/store/index.ts`: when the persist middleware throws on write, drop the oldest 100 entries from `sessions` and retry. If `progress` alone exceeds quota, surface a different one-time notice ("Sign in to keep saving progress").

**Checkpoint**: US2 complete — preferences, profile, progress, sessions all persist across reloads. FOUC-free theme. Private-mode fallback works.

---

## Phase 5: User Story 3 — Guest Progress Is Shaped to Match the Future Authenticated Store (Priority: P3)

**Goal**: A guest progress entry's JSON shape matches feature 001's `user_progress` row column-for-column (minus `user_id`). Same for `GuestSession` vs `sessions`. The shape-compat test asserts every authenticated field has a guest peer of the same name and type.

**Independent Test**: Mock a progress upsert with all fields; serialize to JSON; load `specs/001-supabase-schema-and-seed/data-model.md` shape via the typed compatibility module; assert field-name + type parity. Verified by `tests/unit/shape-compat.test.ts`.

### Tests for User Story 3

- [ ] T070 [P] [US3] Create `frontend/tests/unit/shape-compat.test.ts` (FR-009, FR-010, SC-005): import `GuestProgress` and `GuestSession` from `lib/store/*`, import the authenticated `UserProgress` and `Session` row types from `lib/shape/feature001.types.ts`, use the `AssertEqual` utility from T017 to fail at compile time if a column is missing or has the wrong type. Also runtime-validate a fixture entry against the field name set.

### Implementation for User Story 3

- [ ] T071 [P] [US3] Update `frontend/src/lib/shape/feature001.types.ts` (created in T017) with the full `UserProgress` and `Session` interface declarations sourced from `specs/001-supabase-schema-and-seed/data-model.md` § Phase 2 (the authenticated tables). Keep them as a documented, hand-maintained mirror — when feature 001's schema evolves, this file is updated explicitly.
- [ ] T072 [US3] Fix any field-name or type drift surfaced by T070's `AssertEqual` compile-time checks. Likely sites: `next_review` (snake) vs `nextReview` (camel); decide on the JS convention (camel) and add a `key-mapping` table in `lib/shape/compat.ts` that the migration step in feature 003 can consume.

**Checkpoint**: US3 complete — guest shape is locked. Feature 003's migration can copy row-for-row.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: A11y verification, bundle-budget check, Lighthouse audit, and a manual quickstart walk.

- [ ] T080 [P] Create `frontend/tests/component/shell-a11y.test.tsx` (FR-016, SC-006): mount `<App>` at `/`; run axe-core against the rendered output in both dark and light themes; assert zero violations at WCAG 2.1 AA.
- [ ] T081 [P] Run `pnpm -C frontend test` and `pnpm -C frontend lint`. Resolve any failures.
- [ ] T082 [P] Run `pnpm -C frontend build`. Inspect `dist/assets/*.js` sizes. The home-route initial JS payload (entry chunk + react vendor chunk loaded eagerly) MUST be ≤ 250 KB gzipped (FR-014). Use `gzip -c <file> | wc -c` to measure. If over, split or defer the offender (likely framer-motion).
- [ ] T083 Run Lighthouse against `pnpm -C frontend preview` on `/`. Performance, Accessibility, Best Practices, SEO each ≥ 90 (SC-002). Iterate until passing.
- [ ] T084 [P] Walk `specs/002-react-scaffold/quickstart.md` end-to-end against `pnpm -C frontend dev`. Fix any drift between docs and reality.
- [ ] T085 Update `specs/002-react-scaffold/checklists/requirements.md` to mark satisfied items.
- [ ] T086 [P] Add a one-paragraph "Frontend" section to the project README pointing at `frontend/`, the dev command, and the route map.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** — no dependencies, run immediately
- **Phase 2 (Foundational)** — depends on Phase 1; BLOCKS all user stories
- **Phase 3 (US1)** — depends on Phase 2; delivers MVP
- **Phase 4 (US2)** — depends on Phase 2; can run in parallel with US1 only if a second developer is staffed (otherwise sequential after US1 to share the AppShell + SettingsPage surface)
- **Phase 5 (US3)** — depends on Phase 2 only; fully independent of US1/US2 (touches `lib/shape/` and tests)
- **Phase 6 (Polish)** — depends on whichever stories are in scope

### Within Each User Story

- Tests listed first should be RED before implementation lands.
- Within US1: `routes.ts` (Phase 2) before `App.tsx` before page components.
- Within US2: store slices before `index.ts` composer before `ThemeProvider` before page wiring.
- Within US3: `feature001.types.ts` before `compat.ts` before tests.

### Parallel Opportunities

- All Phase 1 `[P]` tasks (T002–T006, T009) can run in parallel.
- All Phase 2 `[P]` tasks (T011–T014, T016–T021) can run in parallel — they touch different files.
- Within US1: all `[P]` tasks T030–T043 are independent files; T044 is the manual verification gate.
- Within US2: store-slice files T052–T055 are independent; the composer T056 depends on all four.
- Phase 5 has only two implementation tasks; not much parallelism by design.

---

## Parallel Example: User Story 1

```bash
# After Phase 2 completes, fire these together (separate files, no shared edits):
Task: "T030 Component test routing.test.tsx"
Task: "T031 main.tsx"
Task: "T032 App.tsx"
Task: "T033 components/AppShell.tsx"
Task: "T034 components/StreakBadge.tsx"
Task: "T035 components/XpBadge.tsx"
Task: "T036 components/ModeCard.tsx"
Task: "T037 pages/HomePage.tsx"
Task: "T038 pages/LearnIndexPage.tsx"
Task: "T039–T043 the five placeholder + zero-state pages"

# T044 (manual dev walk) runs last.
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 + Phase 2 — `frontend/` package, storage + theme + routes manifest.
2. Phase 3 (US1) — every route renders; navigation works; zero-state UI.
3. **STOP. Demo.** A stakeholder can see the shell on a phone.

### Incremental Delivery

1. Setup + Foundational + US1 → **MVP** (a navigable shell).
2. Add US2 → preferences and progress persist across reloads.
3. Add US3 → shape parity locked, feature 003's migration becomes a copy.
4. Polish → bundle + Lighthouse + a11y gates.

### Parallel Team Strategy

After Phase 2 completes:

- Developer A: US1 (Phase 3) — visible quickly.
- Developer B: US3 (Phase 5) — touches only `lib/shape/` and a test file, no UI overlap.
- US2 (Phase 4) layers in after US1 settles since both edit `<SettingsPage>` and `<AppShell>`.

---

## Notes

- The inline FOUC-prevention script in `index.html` is the riskiest piece of US2 — it must be raw JS (no React/TS), must read localStorage synchronously, and must finish before the React bundle parses. The component test T050 specifically guards this.
- The shape-compat module (T017, T070, T071, T072) is intentionally a hand-maintained mirror, not generated. When feature 001's schema evolves, T071 is updated explicitly; the compile-time `AssertEqual` then surfaces every place this feature drifts.
- No Supabase client is imported in this feature. Even at type level: `feature001.types.ts` copies the shapes, it does NOT import from `tools/` or `@supabase/supabase-js`.
- The 250 KB initial-bundle budget (FR-014) is enforced manually here. Feature 012's Lighthouse gate makes it a CI check.

---

## Summary

| Phase | Story | Count | Tasks | Parallel |
|---|---|---|---|---|
| 1 Setup | — | 10 | T001–T010 | 7 |
| 2 Foundational | — | 11 | T011–T021 | 10 |
| 3 US1 (P1, MVP) | Navigable shell | 15 | T030–T044 | 13 |
| 4 US2 (P2) | Persistence + theme | 13 | T050–T062 | 6 |
| 5 US3 (P3) | Shape parity | 3 | T070–T072 | 1 |
| 6 Polish | — | 7 | T080–T086 | 5 |
| **Total** | | **59 tasks** | | |
