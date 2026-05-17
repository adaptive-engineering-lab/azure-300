# Quickstart: React Scaffold

How to bring up the frontend from a fresh checkout, run it locally, and verify the shell against the spec's success criteria.

---

## Prerequisites

- Node.js 22+ and `pnpm`. (Node 20 works but Node 22 is what CI uses — match if possible.)
- A modern browser with DevTools (any Chromium-based browser, Firefox, or Safari).

The frontend is independent of the Supabase data layer in feature 001 — you do NOT need Docker or Supabase running to develop on feature 002.

---

## 1. Install and run the dev server

```bash
cd frontend
pnpm install
pnpm dev
```

The dev server listens on `http://127.0.0.1:5173`. Open it; you should land on the home screen, in dark mode, with a "Start studying" CTA.

---

## 2. Walk the routes

Tap or directly visit each:

| URL | What you should see |
|---|---|
| `/` | Streak / XP zero-state, primary CTA, brief value statement. |
| `/learn` | Three mode cards (Flashcards / Quiz / Code Review). |
| `/learn/flashcards` | "Coming soon" placeholder with the planned feature description. |
| `/learn/quiz` | Placeholder. |
| `/learn/code-review` | Placeholder. |
| `/progress` | Zero-state surface telling the visitor to start a session. |
| `/settings` | Theme toggle (dark / light), default-session-length picker, reduced-motion toggle. |

Use the browser's back/forward buttons; navigation must work.

---

## 3. Verify persistence

1. In `/settings`, switch the theme to light.
2. Close the tab.
3. Open `http://127.0.0.1:5173` again.

The app should load in light theme **before any content paints** (no flash of dark). This is SC-004.

In DevTools → Application → Local Storage, you should see one key:

```
ai300game.v1.state
```

with a JSON payload containing `preferences.theme === 'light'`.

---

## 4. Verify the private-mode fallback

Open the app in a private/incognito window. The app should load identically; persistence won't survive a reload, and a single dismissible notice should be visible explaining why.

---

## 5. Verify the bundle budget

```bash
pnpm build
```

The build prints the per-chunk sizes. The initial chunk for `/` (sum of `index.html`'s entry script + CSS, gzipped) MUST be under 250 KB. If it isn't, the largest contributor is the violator — check the build report and either remove a dependency or split it into a lazy chunk.

---

## 6. Run the test suite

```bash
pnpm test
```

What runs:

- **Unit** — storage adapter (incl. private-mode fallback), namespace, migrate (version bumps), store slices, shape compatibility with feature 001.
- **Component** — routing (deep links + back/forward), theme FOUC, shell axe-core accessibility pass.

All tests run in `jsdom`. No browser binary needed.

---

## 7. Lighthouse spot-check (optional in development)

```bash
pnpm build && pnpm preview &
npx lighthouse http://127.0.0.1:4173/ --view --preset=desktop
```

The four core categories (Performance, Accessibility, Best Practices, SEO) should all score ≥ 90 on the home screen.

> Note: the formal Lighthouse merge gate lands with feature 012. Until then, the local Lighthouse run is advisory.

---

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Flash of wrong theme on reload | Inline theme script in `index.html` missing or running after the CSS parse | Verify the `<script>` in `<head>` runs synchronously before any `<link rel="stylesheet">`. |
| State doesn't persist across reloads | localStorage write threw (quota) or namespace mismatch | DevTools → Application → Storage; verify `ai300game.v1.state` exists. If it does but doesn't match, the schema version probably bumped — clear and reload. |
| Deep link to `/progress` 404s in production | `vite.config.ts` missing the SPA fallback for the static host | Add the configured 404→`index.html` rewrite to the hosting provider's settings. |
| `pnpm dev` shows a different IP than `127.0.0.1` | Vite picked a public network IP for LAN preview | Use `--host 127.0.0.1` or accept the LAN preview; both work. |
| Test suite reports type mismatch in `shape-compat.test.ts` | Feature 001's schema changed and the guest types didn't | Update `GuestProgress` or `GuestSession` to match — the test is doing its job. |
