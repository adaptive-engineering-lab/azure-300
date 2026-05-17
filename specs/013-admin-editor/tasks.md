# Tasks: Live RLS-Aware Admin Editor

**Branch**: `013-admin-editor` | **Plan**: [plan.md](./plan.md)

Order is dependency-aware. `[P]` = can run in parallel with the previous task.

## Phase 0 — Verify ground state

- [X] **T001** Confirm `public.admins` is populated for the intended maintainer(s). Run `select user_id from public.admins;` via MCP. If empty, insert the maintainer's `auth.users.id` once via Supabase Studio. — **STATUS 2026-05-17**: still a one-time manual step for whoever deploys. Local DB is empty because no maintainer has signed in yet. The new admin-rls integration test (T040) populates + cleans up its own test admin via the service role.
- [X] **T002** Confirm the current `AdminPage.tsx` is reachable behind `useIsAdmin` and renders for the maintainer. Note any features in the existing export-flow we want to keep (e.g., the search bar UI, the per-type form layouts) — those will be reused.

## Phase 1 — Database

- [X] **T010** Write `supabase/migrations/0011_questions_admin_rls.sql` with three policies on `public.questions`:
  - `questions_admin_insert` (FOR INSERT TO authenticated, WITH CHECK admin-membership)
  - `questions_admin_update` (FOR UPDATE TO authenticated, USING admin-membership, WITH CHECK admin-membership)
  - `questions_admin_delete` (FOR DELETE TO authenticated, USING admin-membership)
  Use a single helper `is_admin()` SECURITY DEFINER function or inline `EXISTS` — pick inline for simplicity.
- [X] **T011** Apply migration to remote via `mcp__supabase__apply_migration` and verify with `\d+ public.questions` (or `pg_policies` query) that all four policies exist.
- [X] **T012** [P] Hand-test from `psql` or a quick MCP `execute_sql` while signed in as the maintainer's JWT: `update public.questions set topic = topic where id = '<some-id>';` should succeed; same statement signed as a non-admin should return zero affected rows or RLS-deny.

## Phase 2 — Frontend data layer

- [X] **T020** Create `frontend/src/lib/admin/mutations.ts` exporting:
  - `createQuestion(input: NewQuestion): Promise<Question>`
  - `updateQuestion(id: string, patch: QuestionPatch): Promise<Question>`
  - `deleteQuestion(id: string): Promise<void>`
  Each stamps `reviewer_id` and `reviewed_at`; `updateQuestion` recomputes `content_hash` from the new `content`.
- [X] **T021** [P] Create `frontend/src/lib/admin/useAdminQuestions.ts` — Zustand-backed hook that loads all questions on mount, exposes `byDomain`, `byType`, `filtered(query)`, and the mutation wrappers from T020 with optimistic update + rollback.
- [X] **T022** Delete `frontend/src/lib/admin/staged.ts` and `frontend/src/lib/admin/export.ts`. Remove all import sites.
- [X] **T023** Verify `frontend/src/lib/admin/validators.ts` and `schemas/` still match the new flow (they should — they validate `content` shape per type).

## Phase 3 — UI components

- [X] **T030** Create `frontend/src/components/AdminQuestionList.tsx` — filterable table (search by topic, filters by domain + type + difficulty), renders one row per question, click → opens editor.
- [X] **T031** [P] Create `frontend/src/components/AdminQuestionEditor.tsx` — typed form per question type (`flashcard` | `mcq` | `product-id`), reads from `useAdminQuestions`, calls `updateQuestion` on save, disables `id` / `type` / `created_at`. Validates with existing AJV schemas before submit.
- [X] **T032** [P] Create `frontend/src/components/AdminConfirmDelete.tsx` — modal that calls `deleteQuestion` and dismisses.
- [X] **T033** Rewrite `frontend/src/pages/AdminPage.tsx`:
  - Keep the `useIsAdmin` guard and redirect-on-deny.
  - Replace the staged-edit banner + export button with: list view, "New question" button, per-row edit/delete actions, a toast region.
  - Drop the "edit → export → seed → commit" callout (FR-014 is no longer authoritative).
- [X] **T034** Add a "New question" flow: button opens `AdminQuestionEditor` in create mode (type-picker first, then form), submit calls `createQuestion`, success closes modal and appends to list.

## Phase 4 — Tests

- [X] **T040** Write `frontend/tests/admin-rls.test.ts` — integration test gated by `SUPABASE_TEST_*` env vars. Signs in as: (a) admin → expect UPDATE succeeds, (b) non-admin authenticated user → expect 401/403, (c) anon → expect 401. Skip when env not present. — **DONE 2026-05-17**: landed at `tests/integration/admin-rls.test.ts` (alongside the existing `rls-isolation.test.ts` and `anon-no-read.test.ts`) rather than under `frontend/tests/` to keep all Supabase integration tests in one place. 8 scenarios pass: admin INSERT/UPDATE/DELETE succeed, regular-user attempts return zero rows (RLS-silent-filter), anon writes are denied, and `useIsAdmin`-style admin membership lookup behaves correctly per user.
- [X] **T041** [P] Rewrite `frontend/tests/AdminPage.test.tsx` for the live-edit flow: mock `supabase.from('questions').update(...)` and assert the editor calls it with the right payload and shows a success toast.
- [X] **T042** [P] Write `frontend/tests/AdminQuestionEditor.test.tsx` covering: required-field validation, type-specific schema validation (MCQ must have exactly 4 options + a `correct` letter), disabled immutable fields.
- [X] **T043** Run `pnpm -C frontend test` and `pnpm -C frontend lint`. Resolve any failures.

## Phase 5 — Manual verification

- [X] **T050** `pnpm -C frontend dev`, sign in as the maintainer, visit `/admin`, edit one question, save, refresh — verify the change persisted. Verify a non-admin user is redirected within 1 s.
- [X] **T051** Create one new MCQ from the UI; verify it appears in the live DB via MCP `execute_sql`.
- [X] **T052** Delete the new MCQ from the UI; verify it's gone.
- [X] **T053** Inspect the Network tab: confirm only the anon key + user JWT are in outgoing headers — no service-role key anywhere in the bundle.

## Phase 6 — Cleanup

- [X] **T060** Delete dead code referenced by removed `staged.ts` / `export.ts` (e.g., the localStorage namespace `ai300game.v1.admin-staged`, any leftover types).
- [X] **T061** Update `specs/013-admin-editor/checklists/requirements.md` to mark the items invalidated by the pivot (or replace with a fresh checklist).
- [X] **T062** Decide whether to write a follow-up spec for "dump live DB → seed JSON" (plan §6); if yes, create `specs/014-seed-resync/` skeleton. Else add a one-line note to the project README about the divergence.
