# Contract: Routes

The canonical route paths exposed by the React app. Defined in code at `frontend/src/lib/routes.ts` as a single source of truth — components import from there, never hard-code paths.

## Path set

| Path | Page component | Status in this feature | Notes |
|---|---|---|---|
| `/` | `HomePage` | Implemented | Landing screen; streak + XP + primary CTA. |
| `/learn` | `LearnIndexPage` | Implemented | Mode selector with three `ModeCard`s. |
| `/learn/flashcards` | `FlashcardsPlaceholderPage` | Placeholder | "Coming soon" explanation. Becomes the real flow in feature 004. |
| `/learn/quiz` | `QuizPlaceholderPage` | Placeholder | Becomes feature 005. |
| `/learn/code-review` | `CodeReviewPlaceholderPage` | Placeholder | Becomes feature 006. |
| `/progress` | `ProgressPage` | Implemented (empty-state only) | Renders zero-state for new visitors; future features 007/008 layer in content. |
| `/settings` | `SettingsPage` | Implemented (theme + session length only) | Future features add Sign-in (003), Billing (011), Exam-day countdown (011), etc. |

## Invariants

- Every path above MUST render without crashing on first visit (FR-002).
- Placeholder pages MUST NOT 404 (FR-003).
- All paths MUST be reachable via direct URL (deep link), not only via in-app nav (FR-015).
- The active path MUST be reflected in the browser URL (FR-004) — no client-side state-only "tabs" that share a URL.

## Adding a new route

A new route is added by:

1. Adding a constant to `frontend/src/lib/routes.ts`:

   ```ts
   export const ROUTES = {
     // ...
     newPath: '/some/new/path',
   } as const;
   ```

2. Adding the route to the router config in `App.tsx`.
3. Adding the page component under `pages/`.
4. Adding the route to this contract document.

## What's NOT in this feature

- Authenticated-only routes (e.g., a `/billing` route gated on Pro) — those land with feature 011.
- Public-facing marketing pages (`/about`, `/privacy`) — out of scope; if needed, they go in a separate "public site" feature.
- Catch-all 404 page — implemented as a minimum-viable placeholder; the polished 404 lands with feature 010's design refinement.
