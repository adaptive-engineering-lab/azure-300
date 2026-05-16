# Implementation Plan: PWA Shell, Dark Mode, and Design Refinement

**Branch**: `010-pwa-dark-mode` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)

## Summary

Three deliverables in one feature, kept together because they all touch the same global surfaces:

1. **PWA wiring** — manifest, icons, service worker (via `vite-plugin-pwa`), install prompt with a 3-minute engagement threshold, iOS instruction fallback.
2. **Offline support** — service worker caches the app shell + previously-fetched bank questions; rating writes queue and replay when connectivity returns.
3. **Dark-mode default + refinement pass** — design-token system, dark/light theme, light-mode toggle in settings, typography/spacing audit across every existing screen, `prefers-reduced-motion` respected everywhere.

## Technical Context

**Language**: TypeScript 5.5 + React 18.3
**New deps**: `vite-plugin-pwa@^0.20`, `workbox-window@^7`
**Env vars**: none new; the theme color is a build-time constant
**Storage**: service worker caches (`shell`, `bank`, `assets`); pending-writes queue in IndexedDB (via `idb-keyval` or similar)
**Testing**: vitest for the pending-writes queue; manual Lighthouse PWA audit (SC-001)
**Project**: extends `frontend/`; touches every existing screen for the refinement pass

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-First UX | Pass | PWA install is mobile-first by definition; refinement pass tightens mobile spacing. |
| II. Domain-Aligned Content | N/A | No content changes. |
| III. AI as Authoring Tool | Pass | No runtime AI. |
| IV. Secrets Stay Server-Side | Pass | Service worker explicitly forbidden from caching authenticated Supabase responses (FR-013). |
| V. Measurable Quality Gates | Pass | SC-001 (PWA installable) + SC-004 (Lighthouse ≥ 90 in both themes) are bound to this feature. |

## Project Structure (additions)

```
frontend/
├── public/
│   ├── icons/                          # 192, 512, maskable
│   └── splash/                         # iOS splash images per device class
├── vite.config.ts                      # add VitePWA() with workbox config
└── src/
    ├── lib/
    │   ├── pwa/
    │   │   ├── register.ts             # SW registration via workbox-window
    │   │   ├── engagementClock.ts      # cumulative time tracker, persists to localStorage
    │   │   ├── installPrompt.ts        # captures beforeinstallprompt; iOS fallback detection
    │   │   └── pendingWrites.ts        # IndexedDB-backed offline write queue
    │   ├── theme/
    │   │   ├── tokens.ts               # design tokens (color, spacing, type, radius)
    │   │   ├── ThemeProvider.tsx       # context + persisted preference
    │   │   ├── useTheme.ts
    │   │   └── motion.ts               # prefers-reduced-motion hook + helpers
    ├── components/
    │   ├── InstallPromptCard.tsx       # standalone surface; appears after 3 min
    │   ├── IosInstallInstructions.tsx  # Safari-iOS-specific
    │   ├── OfflineIndicator.tsx        # non-blocking banner
    │   └── ThemeToggle.tsx
    └── styles/
        └── globals.css                 # token CSS vars; dark default
```

Plus a one-time pass across every existing page/component to switch from ad-hoc styles to the new token system.

## Phases

1. **Design tokens + ThemeProvider** — dark as default; light as togglable. Persist preference; system preference fallback.
2. **PWA wiring** — `vite-plugin-pwa` config, manifest, icons/splash, SW registration with skip-waiting.
3. **Engagement clock + install prompt** — accumulate time across visits; show prompt at 3-minute mark; respect 14-day decline cooldown; iOS fallback card.
4. **Offline cache strategy** — workbox config: shell precache + runtime-cache for bank reads + cache budget (25 MB total, LRU eviction).
5. **Pending-writes queue** — IndexedDB-backed; intercept progress + session writes when offline; replay on `online` event.
6. **Refinement pass** — walk every existing screen, apply tokens, tighten typography hierarchy (≤ 3 scales per screen) + spacing (4/8 px grid).
7. **Tests + Lighthouse** — pendingWrites unit tests; manual Lighthouse PWA + per-category audits in both themes.

## Complexity Tracking

Touching every existing page for the refinement pass is risky — easy to break in flight. We accept the risk because skipping it leaves the app feeling like a prototype.

| Decision | Why |
|---|---|
| `vite-plugin-pwa` over hand-rolled SW | Mature, well-supported, generates the manifest + workbox config in lockstep. |
| IndexedDB for the pending-writes queue | localStorage is sync + 5 MB; IndexedDB handles binary + larger volumes and is well-supported. |
| Refinement pass in the same PR as PWA | Visual cohesion is the user-facing payoff; splitting would leave the dark mode + tokens half-applied. |
