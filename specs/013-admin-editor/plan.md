# Implementation Plan: Live RLS-Aware Admin Editor

**Branch**: `013-admin-editor` | **Date**: 2026-05-14 | **Spec**: [spec.md](./spec.md)
**Supersedes**: The export-to-JSON design in [spec.md](./spec.md) (kept for history).

## Summary

Turn `/admin` into a live editor for `public.questions`. Authenticated users whose `auth.uid()` is present in `public.admins` can INSERT / UPDATE / DELETE rows directly from the browser, gated by Postgres RLS. No service-role key in the client. The current `AdminPage.tsx` (built around staged edits + JSON export) is rewritten around `supabase-js` mutations with optimistic UI and rollback on RLS rejection. Seed JSON stays the source of truth for env bootstrap; the admin UI no longer writes to it.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18, Vite 5, Postgres 17 via Supabase
**Primary Dependencies**: `@supabase/supabase-js@2`, `zustand` (existing store), `ajv` (existing JSON-Schema validators in `lib/admin/schemas/`), `react-router-dom@6`
**Storage**: Live Supabase Postgres (project `qyawtdisjblkeiyeaitc`); no localStorage for staged edits anymore
**Testing**: `vitest` + `@testing-library/react` for the UI; a Postgres-side RLS smoke test (anon vs. admin JWT vs. non-admin JWT) extending the existing pattern in `tests/`
**Target Platform**: Same PWA shell as the rest of the app
**Project Type**: Web app — frontend slice with one new SQL migration
**Performance Goals**: Single-row UPDATE round-trip < 400 ms on 4G; list of 60 rows renders < 100 ms; admin-check completes in one query at route mount
**Constraints**: No service-role key in the bundle (Principle IV); all writes gated by RLS; `id`, `type`, `created_at` remain immutable from the UI; client must stamp `reviewer_id` + `reviewed_at` on every write; non-admin users denied within one second of route mount (SC-003 inherited from spec)
**Scale/Scope**: 60 questions today, ~200 at Phase 4; admin list is small (single digits)

## Constitution Check

| Principle | Applies? | Status | Notes |
|---|---|---|---|
| I. Mobile-First UX | Yes | Pass | Admin UI is desktop-primary but must remain usable at 375 px (matches rest of app). |
| II. Domain-Aligned Content Integrity | Yes — core | Pass | Existing CHECK constraints on `domain`, `type`, `difficulty`, `source` enforce invariants server-side. Client validators (`lib/admin/schemas/`) keep the same schemas. |
| III. AI as Authoring Tool, Not Runtime | Yes | Pass | No runtime AI calls added. The new-item form is hand-authored only (the spec's pivot note retains this scope). |
| IV. Secrets Stay Server-Side | Yes — load-bearing | Pass | Browser uses the anon key + the signed-in user's JWT only. Mutation authority comes from the RLS policy, not from a privileged key. |
| V. Measurable Quality Gates | Yes | Pass | RLS smoke test asserts (a) admin can UPDATE, (b) non-admin gets PostgREST 401/403, (c) anon gets 401. UI test asserts non-admin redirect within 1 s. |

**Result**: No violations.

## Project Structure

### Documentation (this feature)

```text
specs/013-admin-editor/
├── plan.md              # This file
├── spec.md              # Original spec + pivot note
├── tasks.md             # Numbered build steps
└── checklists/
    └── requirements.md  # Existing
```

### Source Code

```text
supabase/migrations/
└── 0011_questions_admin_rls.sql   # NEW: INSERT/UPDATE/DELETE policies on questions for admins

frontend/src/
├── pages/
│   └── AdminPage.tsx              # REWRITE: replace staged/export flow with live mutations
├── lib/admin/
│   ├── mutations.ts               # NEW: createQuestion / updateQuestion / deleteQuestion against supabase-js
│   ├── useAdminQuestions.ts       # NEW: list + filter hook with optimistic update support
│   ├── useIsAdmin.ts              # KEEP
│   ├── validators.ts              # KEEP
│   ├── schemas/                   # KEEP (per-type JSON Schemas)
│   ├── staged.ts                  # DELETE (export flow gone)
│   └── export.ts                  # DELETE (export flow gone)
└── components/
    ├── AdminQuestionList.tsx      # NEW: filterable table by domain × type
    ├── AdminQuestionEditor.tsx    # NEW: typed form per question type, submit -> mutations.ts
    └── AdminConfirmDelete.tsx     # NEW: confirmation modal

frontend/tests/
├── admin-rls.test.ts              # NEW: integration test against real Supabase (skipped without env)
├── AdminPage.test.tsx             # REWRITE: live-edit assertions, not export
└── AdminQuestionEditor.test.tsx   # NEW
```

## Design Decisions

1. **Mutation authority via RLS, not service-role**. New migration adds three policies on `public.questions`:
   - `questions_admin_insert` — `for insert to authenticated with check (exists (select 1 from public.admins a where a.user_id = auth.uid()))`
   - `questions_admin_update` — same predicate, `for update`
   - `questions_admin_delete` — same predicate, `for delete`
   The existing `questions_public_read` policy is unchanged.

2. **Audit fields stamped client-side, validated server-side**. The client sets `reviewer_id = auth.user().email` (or `auth.user().id` if email absent) and `reviewed_at = new Date().toISOString()` on every mutation. A future CHECK or trigger could enforce non-null, but is out of scope here.

3. **Optimistic UI with rollback**. `mutations.ts` updates Zustand store immediately, fires the Supabase call, and reverts + toasts on error. PostgREST returns 401/403 for RLS denial — we treat that as "your admin row was revoked" and force a refresh of `useIsAdmin`.

4. **Immutable fields**. `id`, `type`, `created_at` are not editable. `type` change would require deleting and recreating (different schema shape). The UI disables these inputs; the RLS update predicate does not restrict columns (Postgres-side immutability isn't worth a trigger for an internal tool).

5. **Content-hash recomputation**. Every UPDATE recomputes `content_hash` on the client (same SHA-256 helper as the seed CLI) before sending, so the hash always reflects the new `content`. Out-of-band edits would skew this; acceptable for an internal tool.

6. **Seed JSON divergence**. The seed files in `supabase/seed/content/*.json` are no longer kept in sync by the admin UI. Bootstrapping a fresh env will load the original snapshot; live edits made after seed time exist only in the DB. A future "dump current bank to seed" CLI subcommand can close the loop. **Flagged in plan, not in scope.**

7. **No multi-admin coordination**. Last write wins. Two admins editing the same row will overwrite each other. Acceptable for current admin count (1).

## Out of Scope

- Bulk operations (multi-select edit/delete)
- Item history / undo across sessions
- Re-syncing seed JSON from the live DB
- A "purge" tool to delete live rows after a soft-delete in JSON (the old spec's FR-009 is moot)
- AI-assisted authoring inside `/admin` (still routed through feature 009)
