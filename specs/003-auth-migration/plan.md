# Implementation Plan: Supabase Auth and Guest → Account Migration

**Branch**: `003-auth-migration` | **Date**: 2026-05-11 | **Spec**: [spec.md](./spec.md)

## Summary

Add Supabase Auth (email magic link) to the React frontend, manage authenticated state alongside the existing guest store, and ship the one-time guest→account migration that copies localStorage progress and sessions into Supabase when a guest signs in for the first time. Also: display-name edit and account deletion in `/settings`.

## Technical Context

**Language**: TypeScript 5.5 + React 18.3
**New deps**: `@supabase/supabase-js@^2.45`
**Env vars (frontend)**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (both build-time public, embedded in client per Supabase's design — only the `anon` key, never `service_role`)
**Storage**: localStorage (guest state, unchanged), Supabase (authenticated state)
**Testing**: vitest + jsdom for client-side migration logic; real-Supabase integration tests are NOT added here (RLS is already covered by feature 001's test suite)
**Project**: extends `frontend/`; no new package

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-First UX | Pass | Sign-in is a single email field + button; magic-link confirmation screen is one button. |
| II. Domain-Aligned Content | N/A | No content. |
| III. AI as Authoring Tool | Pass | No runtime AI. |
| IV. Secrets Stay Server-Side | Pass | Only `anon` key in the client; service role never leaves the seed tool. |
| V. Measurable Quality Gates | Pass | Sign-in screen Lighthouse a11y ≥ 90; bundle delta budgeted. |

## Project Structure (additions)

```
frontend/
├── .env.example                       # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
└── src/
    ├── lib/
    │   ├── env.ts                     # validate Vite env at startup
    │   ├── supabase.ts                # createClient(anon) singleton
    │   ├── auth/
    │   │   ├── AuthProvider.tsx       # session listener; exposes user via context/store
    │   │   ├── useAuth.ts             # hook
    │   │   └── routes-callback.tsx    # /auth/callback handler
    │   └── migration/
    │       ├── plan.ts                # build MigrationPlan from local state
    │       ├── execute.ts             # idempotent insert via Supabase
    │       └── merge.ts               # conflict resolution for existing rows
    ├── pages/
    │   ├── SignInPage.tsx
    │   ├── AuthCallbackPage.tsx
    │   └── BillingPage.tsx            # placeholder (feature 011 fills)
    └── components/
        ├── MigrationPrompt.tsx
        └── ProfileMenu.tsx
```

## Phases

1. Env + supabase client + AuthProvider that listens to `onAuthStateChange`
2. Sign-in flow + callback route
3. Migration plan + execute, triggered after sign-in
4. Settings: display name + account delete
5. Tests for migration idempotency, conflict resolution, env-validation

## Complexity Tracking

Empty.
