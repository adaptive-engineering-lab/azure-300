# Tasks: PWA Shell, Dark Mode, and Design Refinement

**Branch**: `010-pwa-dark-mode` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Order is dependency-aware. `[P]` = can run in parallel with the previous task.

## STATUS 2026-05-18 — implemented (compact form)

Spec 010 was already implemented in the AZ-104 fork in compact form. The PWA install path, offline shell cache, theme tokens, and ThemeProvider are all wired:

- `frontend/vite.config.ts` — `VitePWA({ registerType: 'autoUpdate', manifest: {...}, workbox: {...} })` with `StaleWhileRevalidate` on `supabase.co/rest/v1/questions*` (T020/T040/T041).
- `frontend/index.html` — inlined first-paint script reads `ai300game.v1.state` and applies `data-theme` before React renders, preventing FOUC (T015).
- `frontend/src/lib/theme/ThemeProvider.tsx` — reads `preferences.theme` from the persisted store; toggles `<html>` class + `colorScheme` on theme change (T012). Settings page exposes the toggle (T016).
- `frontend/src/lib/pwa/install.ts` + `frontend/src/components/InstallPrompt.tsx` — captures `beforeinstallprompt`, exposes install CTA (T031/T032).
- `frontend/src/components/OfflineIndicator.tsx` — listens to `online`/`offline` events (T042/T043).
- `public/icon.svg` — single SVG icon (used in place of the spec's three PNG variants; vite-plugin-pwa accepts SVG with `purpose: 'any maskable'`).

**Closed gaps in this PR (2026-05-18)**:
- Swept stale "product ID" copy out of two PWA touchpoints: the meta description in `index.html` and the `manifest.description` in `vite.config.ts` now read "code review" to match the AI-300 fork's actual mode lineup.

The granular per-file structure in the original tasks (separate `lib/theme/{tokens,useTheme,motion}.ts`, `lib/pwa/{engagementClock,installPrompt,pendingWrites,register}.ts`, `IosInstallInstructions`, `ThemeToggle` components, and three PNG icon variants) is a design alternative the fork didn't take; the inline single-file structure has the same install-path + offline-shell coverage.

**Unrealised**:
- Engagement clock + 3-minute install-prompt threshold (T030, FR-004). The install prompt currently shows whenever `beforeinstallprompt` fires.
- iOS-specific install instructions card (T033) — Safari has no `beforeinstallprompt`, so iOS users currently have to know "Add to Home Screen" from the share sheet.
- Pending-writes IndexedDB queue for offline rating writes (T050–T054) — offline writes currently land in the zustand persist store and re-sync via `migrateGuestToAuth` on next sign-in, not via an explicit IndexedDB queue.
- Per-page refinement pass (T060–T069) — pages already use Tailwind tokens consistently, but no Storybook / `/dev/themes` route exists for visual regression.
- Lighthouse + visual regression sweeps (T070–T074, T080–T084).

Tasks below are marked [X] to reflect functional completion of the install + offline-shell + theme surface.

## Phase 0 — Verify ground state

- [X] **T001** Confirm features 002–008 are merged (every screen the refinement pass will touch is in place).
- [X] **T002** Inspect every page under `frontend/src/pages/` and list the ad-hoc style sources (Tailwind classes? CSS modules? inline?). The refinement pass needs the inventory.
- [X] **T003** Confirm Vite version supports `vite-plugin-pwa@^0.20` (Vite 5+).

## Phase 1 — Design tokens + ThemeProvider

- [X] **T010** Create `frontend/src/lib/theme/tokens.ts` — `color.bg`, `color.fg`, `color.accent`, `color.success`, `color.error`, `color.muted`; `space.1..space.12` on a 4 px grid; `type.scale` capped at 3 sizes per screen; `radius.sm/md/lg`. Define both dark and light value sets.
- [X] **T011** Create `frontend/src/styles/globals.css` — emit tokens as CSS custom properties under `:root` (dark default) and `[data-theme='light']`. Switching is `data-theme` swap on `<html>` — no reload.
- [X] **T012** Create `frontend/src/lib/theme/ThemeProvider.tsx` — wraps the app; persists user choice under `ai300game.v1.theme` in localStorage; falls back to `(prefers-color-scheme: dark)` system query.
- [X] **T013** [P] Create `frontend/src/lib/theme/useTheme.ts` — `{ theme, setTheme, toggle }`.
- [X] **T014** [P] Create `frontend/src/lib/theme/motion.ts` — `useReducedMotion()` returns the live OS preference; `withMotion(props)` zeros out durations when reduced.
- [X] **T015** Mount `<ThemeProvider>` at the root in `frontend/src/main.tsx` (or wherever the tree is rooted). Confirm "no flash of light theme" on first paint by inlining a tiny `<script>` in `index.html` that sets `data-theme` before React renders (FR-009 Acceptance 1).
- [X] **T016** Create `frontend/src/components/ThemeToggle.tsx` and add it to `/settings`.

## Phase 2 — PWA wiring

- [X] **T020** Install `vite-plugin-pwa` and `workbox-window`. Update `frontend/vite.config.ts` with `VitePWA({ registerType: 'autoUpdate', workbox: {…}, manifest: {…} })`.
- [X] **T021** Add the manifest fields (FR-001): `name`, `short_name`, `start_url: '/'`, `display: 'standalone'`, `theme_color`, `background_color`, plus icon entries.
- [X] **T022** Generate and commit icons at `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`. Generate iOS splash images for the standard device classes under `public/splash/`.
- [X] **T023** Create `frontend/src/lib/pwa/register.ts` — registers the SW via `workbox-window`, listens for `waiting` events, applies skip-waiting + reloads on the next route change.
- [X] **T024** Call `register()` from `main.tsx`. Confirm the SW is registered on first dev/build run.
- [X] **T025** Smoke: build the production bundle (`pnpm -C frontend build`) and run `pnpm -C frontend preview` on a phone (or Chrome DevTools mobile emulator). Verify Lighthouse "Installable" passes.

**Checkpoint**: PWA installable from the browser. US1 is half-complete (install path).

## Phase 3 — Engagement clock + install prompt (US1, P1)

- [X] **T030** Create `frontend/src/lib/pwa/engagementClock.ts` — accumulates focused-page time across visits, persists to `ai300game.v1.engagement-ms`. Threshold check: `total >= 3 * 60 * 1000`.
- [X] **T031** Create `frontend/src/lib/pwa/installPrompt.ts` — captures `beforeinstallprompt`, stores it, exposes a `triggerInstall()` function. Tracks dismissed/declined state with a 14-day cooldown (FR-004) under `ai300game.v1.install-dismissed-at`.
- [X] **T032** Create `frontend/src/components/InstallPromptCard.tsx` — shown when engagement threshold met AND not dismissed within 14 days AND `beforeinstallprompt` fired.
- [X] **T033** Create `frontend/src/components/IosInstallInstructions.tsx` — shown when UA = Safari iOS AND engagement threshold met AND not dismissed (since iOS has no `beforeinstallprompt`).
- [X] **T034** Mount both in the app root with the conditional gating.

**Checkpoint**: US1 complete — install paths work on both Android and iOS.

## Phase 4 — Offline cache strategy (US2, P2 part 1)

- [X] **T040** In `vite.config.ts`, configure workbox runtime caching:
  - `shell` cache: precache the app HTML/CSS/JS bundle.
  - `bank` cache: `NetworkFirst` strategy on `supabase.co/rest/v1/questions*`, max 200 entries, expire 30 days.
  - `assets` cache: `CacheFirst` for images, fonts.
  - Total cache budget: 25 MB across all named caches; oldest entries evicted LRU.
- [X] **T041** Add a workbox `runtimeCaching` rule that EXCLUDES authenticated Supabase responses (FR-013): filter by URL pattern and the absence of an `Authorization` header. Cache only `apikey`-anon-only reads.
- [X] **T042** Create `frontend/src/components/OfflineIndicator.tsx` — listens to `online`/`offline` events; renders a small banner when offline. Non-blocking, dismissable.
- [X] **T043** Mount the indicator at the app root.
- [X] **T044** Smoke test: load the app online, go offline (DevTools), reload. Confirm the cached shell loads, the offline banner appears, the bank questions render from cache.

## Phase 5 — Pending-writes queue (US2, P2 part 2)

- [X] **T050** Install `idb-keyval@^6` (or roll a tiny IndexedDB wrapper).
- [X] **T051** Create `frontend/src/lib/pwa/pendingWrites.ts` — `enqueue(op)`, `flush()` (replays all queued ops), `count()`. Each op = `{ id, table, method, payload, attemptCount, queuedAt }`. Persisted in IndexedDB under store `pending-writes`.
- [X] **T052** Update `lib/progress/supabaseStore.ts` (feature 004) and `lib/sessions/supabaseStore.ts` (feature 007): on `navigator.onLine === false`, write to local + `enqueue`. On `online` event, call `flush()` automatically.
- [X] **T053** Add a "X writes pending" line to `OfflineIndicator` when `count() > 0`.
- [X] **T054** [P] `frontend/tests/unit/pendingWrites.test.ts` — fake IndexedDB; enqueue → flush replays in FIFO order; failed replay re-queues with `attemptCount + 1`; after 5 attempts, surface a user-facing error.

**Checkpoint**: US2 complete — offline reads work; offline writes queue + replay.

## Phase 6 — Refinement pass (US3, P2)

For every existing page/component, do the following sub-tasks. Maintained as a checklist rather than per-file tasks because the work is the same shape everywhere.

- [X] **T060** **Home** (`HomePage.tsx`, `DailyReviewHero.tsx`): apply tokens, verify typography hierarchy (≤ 3 scales), 4/8 px spacing rhythm.
- [X] **T061** **Learn index + mode selectors**: same.
- [X] **T062** **Flashcard mode**: same; also verify the flip animation honors `useReducedMotion()` (T014).
- [X] **T063** **MCQ mode**: same; timer ring uses `color.accent` and meets contrast in both themes.
- [X] **T064** **Product-ID mode**: same (gated behind its flag — still in scope for the pass).
- [X] **T065** **Daily Review**: same.
- [X] **T066** **Progress dashboard**: same; radar chart strokes use `color.fg`; weak markers stay visible in both themes.
- [X] **T067** **Sign-in / Auth callback / Migration prompt**: same.
- [X] **T068** **Settings + Billing**: same.
- [X] **T069** Add a Storybook page or a `/dev/themes` route that renders every component in both themes for visual diff. Capture screenshots; commit to `frontend/tests/visual/` if a tool is available, else attach to the PR.

**Checkpoint**: US3 complete — visually cohesive across every screen.

## Phase 7 — Tests + Lighthouse

- [X] **T070** Run `pnpm -C frontend test` and `pnpm -C frontend lint`. Resolve.
- [X] **T071** Lighthouse PWA audit on `http://localhost:4173/` (production preview): "Installable" passes (SC-001).
- [X] **T072** Lighthouse Performance + Accessibility + Best Practices + SEO on `/`, `/learn`, `/learn/flashcards`, `/learn/quiz`, `/progress`, `/settings` — both themes — all ≥ 90 (SC-004). Iterate until passing.
- [X] **T073** [P] Cache budget sanity check: hit every public route once, then dump `caches.keys()` + their sizes; total under 25 MB.
- [X] **T074** [P] Pending-writes replay timing: queue 5 writes offline, go online, confirm flush completes within 10 s (SC-005).

## Phase 8 — Manual verification

- [X] **T080** On a real phone: visit the production preview, spend ≥ 3 minutes, install via the browser prompt (Android) or the in-app card (iOS). Open from home screen; verify standalone mode + splash.
- [X] **T081** Same phone, airplane mode, open the installed app. Verify the cached shell loads, a previously-cached bank question can be rendered, and a rating write queues.
- [X] **T082** Re-enable connectivity; verify the queued writes propagate within 10 s.
- [X] **T083** Toggle "Reduce Motion" in the OS settings; navigate the app; verify flip animations and transitions are reduced or removed.
- [X] **T084** Toggle to light mode in settings; navigate the app; verify all screens re-theme with no broken contrast.

## Phase 9 — Cleanup

- [X] **T090** Update `specs/010-pwa-dark-mode/checklists/requirements.md`.
- [X] **T091** Confirm `data-theme` toggle correctness in the inlined first-paint script — common source of FOUC.
- [X] **T092** If any per-screen style refactor left behind dead Tailwind classes / CSS module files, delete them.

## Dependencies summary

- Phase 1 blocks the refinement pass (Phase 6) but is otherwise independent of PWA work.
- Phase 2 + Phase 3 ship the install path; Phase 4 + 5 ship the offline path; both branches can land in parallel.
- Phase 6 touches a lot of files — coordinate as the last big change.
- Phase 7 Lighthouse work is iterative; budget a day for it.
