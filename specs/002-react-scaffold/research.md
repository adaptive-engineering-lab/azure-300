# Phase 0 Research: React Scaffold

No `[NEEDS CLARIFICATION]` markers remain in the spec. This document captures the seven design decisions that shape the implementation without rising to spec-level questions.

---

## 1. Build tool

**Decision**: Vite 5 with the official React plugin (`@vitejs/plugin-react`).

**Rationale**:

- The constitution locks Vite as the build tool.
- Vite gives sub-second HMR locally and a Rollup-based production build with code splitting out of the box — useful for FR-014's 250 KB initial-bundle budget.
- Vite's CSS pipeline integrates Tailwind via PostCSS without extra plugins.

**Alternatives considered**:

- **Next.js**: SSR/SSG capabilities are not needed and would bring an opinionated routing layer that conflicts with the constitution's React Router choice. Rejected.
- **Create React App**: deprecated and slower at HMR. Rejected.

---

## 2. State management

**Decision**: Zustand 4 with the `persist` middleware backed by a custom storage adapter (not the default `createJSONStorage(() => localStorage)`).

**Rationale**:

- The constitution locks Zustand. The `persist` middleware is the canonical way to back a slice with browser storage.
- A *custom* adapter is needed because spec FR-012 requires graceful degradation when localStorage is unavailable. The adapter detects availability at construction and falls back to an in-memory `Map` that is shape-compatible with the `Storage` interface.
- Zustand's slice composition pattern fits the four shapes the spec defines (preferences, profile, progress, sessions) without forcing a Redux-style boilerplate layer.

**Alternatives considered**:

- **Redux Toolkit with redux-persist**: more ceremony for what is fundamentally a small store. Rejected by the constitution.
- **React Context only**: no built-in persistence; every consumer re-renders on any change. Rejected.

---

## 3. localStorage schema versioning

**Decision**: A top-level `__version` integer in the persisted payload. On read, if the version is older than current, run the registered migrators in order; if newer (downgrade), clear the namespace and start fresh with a one-time notice.

**Rationale**:

- FR-013 requires version detection + graceful handling. A version integer is the simplest pattern Zustand's `persist` middleware natively supports via its `version` and `migrate` options.
- Running migrators in order lets each "version bump" be a small, reviewable function — the same shape feature 001's migrations use.
- Forward-incompatibility (newer-than-current data) is rare in practice (only happens if the user time-travels with an older app version); clearing is safer than guessing.

**Alternatives considered**:

- **No version, just shape-validate on read**: validation passes can mask silent data loss when a field's meaning changes. Rejected.
- **Append-only event log instead of a snapshot**: overkill for browser state. Rejected.

---

## 4. localStorage availability detection

**Decision**: A one-time probe at module load — write a short string to `__ai300game.probe`, read it back, delete it. If any step throws or returns the wrong value, mark storage unavailable and switch the adapter to the in-memory fallback.

**Rationale**:

- Naïvely calling `window.localStorage.setItem` later breaks in private-browsing modes and in browsers that have explicitly disabled DOM storage.
- A single probe at startup keeps detection cost negligible and centralizes the decision.

**Alternatives considered**:

- **Probe-on-every-write**: redundant cost. Rejected.
- **Trust `window.localStorage !== undefined`**: false-positives in Safari private mode (the object exists but throws on write). Rejected.

---

## 5. Theme apply timing (FOUC prevention)

**Decision**: A short synchronous script in `index.html` that reads `localStorage["ai300game.v1.preferences"]`, extracts `theme`, and sets `document.documentElement.classList` to `dark` or `light` before the React bundle parses. The React-side `ThemeProvider` then takes over and stays in sync with subsequent toggles.

**Rationale**:

- SC-004 requires no flash of incorrect theme. Any approach that waits for React hydration will flash because Tailwind's `dark:` variants apply via a class on `<html>` and React mounts after CSS paints.
- An inline script in `<head>` runs before paint and sets the class. The cost is ~20 lines of vanilla JS, no FCP impact.

**Alternatives considered**:

- **CSS `prefers-color-scheme` only**: ignores the user's explicit preference once they've toggled in settings. Rejected — the spec mandates persistence.
- **React server-rendered preference**: not possible in a Vite-SPA build. Rejected.

---

## 6. Route shape and lazy loading

**Decision**: All seven routes (`/`, `/learn`, `/learn/flashcards`, `/learn/quiz`, `/learn/product-id`, `/progress`, `/settings`) declared centrally in `frontend/src/lib/routes.ts`. Page components are lazy-loaded with `React.lazy` so each route's JS chunks off the home payload.

**Rationale**:

- Centralizing the path strings keeps the `routes.ts` file the single source of truth — eliminates magic strings sprinkled across components.
- Lazy-loading every route except `HomePage` keeps the initial bundle close to the 250 KB budget (FR-014). Settings + Progress carry chart libraries in later features; lazy is the right baseline now.
- `Suspense` boundaries around the lazy routes give us a place to slot in skeleton states later without touching the route definitions.

**Alternatives considered**:

- **Eager imports of every page**: simpler but blows the bundle budget when feature 007's radar chart lands.
- **File-system-based routing à la Next**: introduces a Next-like layer that conflicts with Vite + React Router. Rejected.

---

## 7. Shape compatibility with feature 001

**Decision**: Define TypeScript types for `GuestProgress` and `GuestSession` that are *structurally identical* to feature 001's `user_progress` and `sessions` rows (minus `user_id`, plus a runtime-injected `pending_user_id: null` placeholder). Test parity automatically: a `shape-compat.test.ts` reads the JSON Schemas from `specs/001-supabase-schema-and-seed/contracts/` (or the SQL constraints) and asserts type equivalence at test time.

**Rationale**:

- FR-009 / FR-010 / SC-005 require that the migration in feature 003 can copy guest entries row-for-row. Locking the shape now — with a test that fails the moment feature 001 changes — is the cheapest way to prevent drift over the year between this feature and a future schema bump.
- Importing the JSON Schemas at test time means the parity is *enforced*, not just documented.

**Alternatives considered**:

- **Generate types from Postgres**: requires a separate tool (`supabase gen types typescript`) and an online DB connection at build. Out of scope for now; we'll revisit when feature 003 lands.
- **Just write the types and hope they stay in sync**: brittle; drift will surface as a feature 003 migration bug. Rejected.

---

## Open items deferred to later phases

- **Service-worker / PWA**: feature 010.
- **Auth flow + Supabase client setup**: feature 003.
- **Question-bank reads**: feature 004.
- **Streak / XP increment logic**: features 004–008 (this feature ships the zero-state UI and the store shapes only).
- **Charting library choice**: feature 007 picks the radar-chart library.
