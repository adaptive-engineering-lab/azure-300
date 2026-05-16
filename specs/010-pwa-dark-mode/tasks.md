# Tasks: PWA Shell, Dark Mode, and Design Refinement

**Branch**: `010-pwa-dark-mode` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Order is dependency-aware. `[P]` = can run in parallel with the previous task.

## Phase 0 — Verify ground state

- **T001** Confirm features 002–008 are merged (every screen the refinement pass will touch is in place).
- **T002** Inspect every page under `frontend/src/pages/` and list the ad-hoc style sources (Tailwind classes? CSS modules? inline?). The refinement pass needs the inventory.
- **T003** Confirm Vite version supports `vite-plugin-pwa@^0.20` (Vite 5+).

## Phase 1 — Design tokens + ThemeProvider

- **T010** Create `frontend/src/lib/theme/tokens.ts` — `color.bg`, `color.fg`, `color.accent`, `color.success`, `color.error`, `color.muted`; `space.1..space.12` on a 4 px grid; `type.scale` capped at 3 sizes per screen; `radius.sm/md/lg`. Define both dark and light value sets.
- **T011** Create `frontend/src/styles/globals.css` — emit tokens as CSS custom properties under `:root` (dark default) and `[data-theme='light']`. Switching is `data-theme` swap on `<html>` — no reload.
- **T012** Create `frontend/src/lib/theme/ThemeProvider.tsx` — wraps the app; persists user choice under `ai300game.v1.theme` in localStorage; falls back to `(prefers-color-scheme: dark)` system query.
- **T013** [P] Create `frontend/src/lib/theme/useTheme.ts` — `{ theme, setTheme, toggle }`.
- **T014** [P] Create `frontend/src/lib/theme/motion.ts` — `useReducedMotion()` returns the live OS preference; `withMotion(props)` zeros out durations when reduced.
- **T015** Mount `<ThemeProvider>` at the root in `frontend/src/main.tsx` (or wherever the tree is rooted). Confirm "no flash of light theme" on first paint by inlining a tiny `<script>` in `index.html` that sets `data-theme` before React renders (FR-009 Acceptance 1).
- **T016** Create `frontend/src/components/ThemeToggle.tsx` and add it to `/settings`.

## Phase 2 — PWA wiring

- **T020** Install `vite-plugin-pwa` and `workbox-window`. Update `frontend/vite.config.ts` with `VitePWA({ registerType: 'autoUpdate', workbox: {…}, manifest: {…} })`.
- **T021** Add the manifest fields (FR-001): `name`, `short_name`, `start_url: '/'`, `display: 'standalone'`, `theme_color`, `background_color`, plus icon entries.
- **T022** Generate and commit icons at `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`. Generate iOS splash images for the standard device classes under `public/splash/`.
- **T023** Create `frontend/src/lib/pwa/register.ts` — registers the SW via `workbox-window`, listens for `waiting` events, applies skip-waiting + reloads on the next route change.
- **T024** Call `register()` from `main.tsx`. Confirm the SW is registered on first dev/build run.
- **T025** Smoke: build the production bundle (`pnpm -C frontend build`) and run `pnpm -C frontend preview` on a phone (or Chrome DevTools mobile emulator). Verify Lighthouse "Installable" passes.

**Checkpoint**: PWA installable from the browser. US1 is half-complete (install path).

## Phase 3 — Engagement clock + install prompt (US1, P1)

- **T030** Create `frontend/src/lib/pwa/engagementClock.ts` — accumulates focused-page time across visits, persists to `ai300game.v1.engagement-ms`. Threshold check: `total >= 3 * 60 * 1000`.
- **T031** Create `frontend/src/lib/pwa/installPrompt.ts` — captures `beforeinstallprompt`, stores it, exposes a `triggerInstall()` function. Tracks dismissed/declined state with a 14-day cooldown (FR-004) under `ai300game.v1.install-dismissed-at`.
- **T032** Create `frontend/src/components/InstallPromptCard.tsx` — shown when engagement threshold met AND not dismissed within 14 days AND `beforeinstallprompt` fired.
- **T033** Create `frontend/src/components/IosInstallInstructions.tsx` — shown when UA = Safari iOS AND engagement threshold met AND not dismissed (since iOS has no `beforeinstallprompt`).
- **T034** Mount both in the app root with the conditional gating.

**Checkpoint**: US1 complete — install paths work on both Android and iOS.

## Phase 4 — Offline cache strategy (US2, P2 part 1)

- **T040** In `vite.config.ts`, configure workbox runtime caching:
  - `shell` cache: precache the app HTML/CSS/JS bundle.
  - `bank` cache: `NetworkFirst` strategy on `supabase.co/rest/v1/questions*`, max 200 entries, expire 30 days.
  - `assets` cache: `CacheFirst` for images, fonts.
  - Total cache budget: 25 MB across all named caches; oldest entries evicted LRU.
- **T041** Add a workbox `runtimeCaching` rule that EXCLUDES authenticated Supabase responses (FR-013): filter by URL pattern and the absence of an `Authorization` header. Cache only `apikey`-anon-only reads.
- **T042** Create `frontend/src/components/OfflineIndicator.tsx` — listens to `online`/`offline` events; renders a small banner when offline. Non-blocking, dismissable.
- **T043** Mount the indicator at the app root.
- **T044** Smoke test: load the app online, go offline (DevTools), reload. Confirm the cached shell loads, the offline banner appears, the bank questions render from cache.

## Phase 5 — Pending-writes queue (US2, P2 part 2)

- **T050** Install `idb-keyval@^6` (or roll a tiny IndexedDB wrapper).
- **T051** Create `frontend/src/lib/pwa/pendingWrites.ts` — `enqueue(op)`, `flush()` (replays all queued ops), `count()`. Each op = `{ id, table, method, payload, attemptCount, queuedAt }`. Persisted in IndexedDB under store `pending-writes`.
- **T052** Update `lib/progress/supabaseStore.ts` (feature 004) and `lib/sessions/supabaseStore.ts` (feature 007): on `navigator.onLine === false`, write to local + `enqueue`. On `online` event, call `flush()` automatically.
- **T053** Add a "X writes pending" line to `OfflineIndicator` when `count() > 0`.
- **T054** [P] `frontend/tests/unit/pendingWrites.test.ts` — fake IndexedDB; enqueue → flush replays in FIFO order; failed replay re-queues with `attemptCount + 1`; after 5 attempts, surface a user-facing error.

**Checkpoint**: US2 complete — offline reads work; offline writes queue + replay.

## Phase 6 — Refinement pass (US3, P2)

For every existing page/component, do the following sub-tasks. Maintained as a checklist rather than per-file tasks because the work is the same shape everywhere.

- **T060** **Home** (`HomePage.tsx`, `DailyReviewHero.tsx`): apply tokens, verify typography hierarchy (≤ 3 scales), 4/8 px spacing rhythm.
- **T061** **Learn index + mode selectors**: same.
- **T062** **Flashcard mode**: same; also verify the flip animation honors `useReducedMotion()` (T014).
- **T063** **MCQ mode**: same; timer ring uses `color.accent` and meets contrast in both themes.
- **T064** **Product-ID mode**: same (gated behind its flag — still in scope for the pass).
- **T065** **Daily Review**: same.
- **T066** **Progress dashboard**: same; radar chart strokes use `color.fg`; weak markers stay visible in both themes.
- **T067** **Sign-in / Auth callback / Migration prompt**: same.
- **T068** **Settings + Billing**: same.
- **T069** Add a Storybook page or a `/dev/themes` route that renders every component in both themes for visual diff. Capture screenshots; commit to `frontend/tests/visual/` if a tool is available, else attach to the PR.

**Checkpoint**: US3 complete — visually cohesive across every screen.

## Phase 7 — Tests + Lighthouse

- **T070** Run `pnpm -C frontend test` and `pnpm -C frontend lint`. Resolve.
- **T071** Lighthouse PWA audit on `http://localhost:4173/` (production preview): "Installable" passes (SC-001).
- **T072** Lighthouse Performance + Accessibility + Best Practices + SEO on `/`, `/learn`, `/learn/flashcards`, `/learn/quiz`, `/progress`, `/settings` — both themes — all ≥ 90 (SC-004). Iterate until passing.
- **T073** [P] Cache budget sanity check: hit every public route once, then dump `caches.keys()` + their sizes; total under 25 MB.
- **T074** [P] Pending-writes replay timing: queue 5 writes offline, go online, confirm flush completes within 10 s (SC-005).

## Phase 8 — Manual verification

- **T080** On a real phone: visit the production preview, spend ≥ 3 minutes, install via the browser prompt (Android) or the in-app card (iOS). Open from home screen; verify standalone mode + splash.
- **T081** Same phone, airplane mode, open the installed app. Verify the cached shell loads, a previously-cached bank question can be rendered, and a rating write queues.
- **T082** Re-enable connectivity; verify the queued writes propagate within 10 s.
- **T083** Toggle "Reduce Motion" in the OS settings; navigate the app; verify flip animations and transitions are reduced or removed.
- **T084** Toggle to light mode in settings; navigate the app; verify all screens re-theme with no broken contrast.

## Phase 9 — Cleanup

- **T090** Update `specs/010-pwa-dark-mode/checklists/requirements.md`.
- **T091** Confirm `data-theme` toggle correctness in the inlined first-paint script — common source of FOUC.
- **T092** If any per-screen style refactor left behind dead Tailwind classes / CSS module files, delete them.

## Dependencies summary

- Phase 1 blocks the refinement pass (Phase 6) but is otherwise independent of PWA work.
- Phase 2 + Phase 3 ship the install path; Phase 4 + 5 ship the offline path; both branches can land in parallel.
- Phase 6 touches a lot of files — coordinate as the last big change.
- Phase 7 Lighthouse work is iterative; budget a day for it.
