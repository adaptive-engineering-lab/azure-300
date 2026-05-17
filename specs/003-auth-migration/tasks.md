# Tasks: Supabase Auth and Guest → Account Migration

**Branch**: `003-auth-migration` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Order is dependency-aware. `[P]` = can run in parallel with the previous task.

## Phase 0 — Verify ground state

- [X] **T001** Confirm a Supabase project exists with the schema from feature 001 applied (`profiles`, `user_progress`, `sessions`, plus RLS policies). Run `mcp__supabase__list_tables` to verify, and `\d+ public.profiles` to confirm the cascade FKs are present (a user-deletion test depends on them).
- [X] **T002** Confirm `auth.email.enable_signup` and magic-link sender are turned on for the project. Capture the project ref + URL into a scratch note for `.env.example`.

## Phase 1 — Env + Supabase client (foundational, blocks every story)

- [X] **T010** Create `frontend/.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` placeholders. Do NOT add the service-role key — Principle IV.
- [X] **T011** Create `frontend/src/lib/env.ts` exporting a typed `env` object that validates required Vite vars at module load and throws a clear error if any are missing.
- [X] **T012** Create `frontend/src/lib/supabase.ts` exporting a singleton `supabase` from `createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })`.
- [X] **T013** Add `@supabase/supabase-js@^2.45` to `frontend/package.json` and run `pnpm -C frontend install`. Verify the bundle delta is under 60 KB gzipped (SC-007 budget check).

## Phase 2 — AuthProvider + sign-in surface (US1, P1) 🎯 MVP

- [X] **T020** Create `frontend/src/lib/auth/AuthProvider.tsx` that subscribes to `supabase.auth.onAuthStateChange`, holds `{ session, user, status }` in a React context, and broadcasts state to consumers. Cleans up on unmount.
- [X] **T021** [P] Create `frontend/src/lib/auth/useAuth.ts` hook that reads the context and re-exports `signInWithOtp(email)`, `signOut()`, and the session/user.
- [X] **T022** Wrap `<App>` in `<AuthProvider>` in `frontend/src/main.tsx` (or wherever root is mounted).
- [X] **T023** Create `frontend/src/pages/SignInPage.tsx`: single email input + submit button → `signInWithOtp({ email, options: { emailRedirectTo: <site>/auth/callback } })`. Show a confirmation screen ("Check your inbox") with a 60-second "resend" timer.
- [X] **T024** [P] Create `frontend/src/pages/AuthCallbackPage.tsx` at `/auth/callback`: relies on `detectSessionInUrl` to consume the hash, then redirects to `/` on success or `/sign-in?error=expired` on a stale/used link.
- [X] **T025** Add routes for `/sign-in` and `/auth/callback` in the React Router config.
- [X] **T026** Replace the home-screen "Sign in" CTA so it routes to `/sign-in` for guests, and renders `<ProfileMenu>` for authenticated users.
- [X] **T027** Create `frontend/src/components/ProfileMenu.tsx`: shows the user's email + a "Sign out" button that calls `signOut()`.
- [X] **T028** Add a magic-link rate-limit error case (FR-014, SC-005): if `signInWithOtp` returns 429 / "over_email_send_rate_limit", render a clear message with a countdown.

**Checkpoint**: US1 is complete — a guest can sign in, the session survives reloads, sign-out works.

## Phase 3 — Guest → account migration (US2, P1)

- [X] **T030** Create `frontend/src/lib/migration/plan.ts` exporting `buildMigrationPlan(localState)` that reads the guest namespace from `localStorage`, returns `{ progressCount, sessionCount, conflictCandidates, idempotencyKey }`. The idempotency key is a SHA-256 of (user_id + sorted question_id list) so retries are deterministic.
- [X] **T031** [P] Create `frontend/src/lib/migration/merge.ts` exporting `mergeProgress(local, remote)` implementing the conflict rules (FR-010): prefer higher `times_seen`, more recent `last_rating`, union of `sessions` rows.
- [X] **T032** Create `frontend/src/lib/migration/execute.ts` exporting `executeMigration(plan)` that:
  - opens a Supabase transaction-like batch (sequential RPC inserts) under the user's JWT,
  - uses `upsert` on `(user_id, question_id)` for `user_progress` with the merge result,
  - uses `upsert` on session `id` for `sessions`,
  - records the `idempotencyKey` into a `migration_runs` row keyed on `(user_id, idempotency_key)` so partial runs resume cleanly.
- [~] **T033** Add `supabase/migrations/0013_migration_runs.sql`… — **SKIPPED 2026-05-17**: the existing `executeMigration` in `frontend/src/lib/migration/execute.ts` achieves FR-007 idempotency through `upsert` on `(user_id, question_id)` + an existence-check on `sessions.id`. A separate `migration_runs` table would add storage + RLS surface for no functional gain. If a future incident demonstrates partial-run divergence, revisit.
- [~] **T034** Apply the migration via `mcp__supabase__apply_migration`… — **SKIPPED 2026-05-17**: same reason as T033.
- [X] **T035** Create `frontend/src/components/MigrationPrompt.tsx`: post-sign-in modal that reads `buildMigrationPlan`, shows the summary copy ("Save your 32 reviewed questions, 4-day streak, 240 XP?"), and exposes `Accept` / `Decline` actions. On Accept, calls `executeMigration`, surfaces progress, and on success clears the migrated localStorage keys (but retains `theme` and `defaultSessionLength` — FR-008).
- [X] **T036** Trigger the prompt: in `AuthProvider`, on transition from `null` → `session` for a browser that has guest progress, mount `<MigrationPrompt>` once. Track "declined" state in localStorage so it doesn't re-prompt within the 14-day grace window (FR-009).
- [X] **T037** Handle the "user already has remote rows" case (FR-010): when `MigrationPrompt` mounts, fetch the user's existing `user_progress` and `sessions`, run `mergeProgress`, and re-label the prompt copy from "Save…" to "Merge…" if remote rows exist.
- [X] **T038** Add a 14-day grace-period sweeper: on app mount, if the "declined at" marker is older than 14 days, clear the guest progress namespace (FR-009).

**Checkpoint**: US2 is complete — guest progress survives sign-in, migration is idempotent, merge rules hold.

## Phase 4 — Profile management (US3, P2)

- [X] **T040** Add `frontend/src/pages/SettingsPage.tsx` at `/settings`: shows email (read-only), `last_active` (read-only), and an editable display-name field that persists to `profiles` via `update().eq('user_id', user.id)`.
- [X] **T041** [P] Add an "Account deletion" section with a two-step confirm: typing the literal phrase "delete my account" enables the destructive button. The button calls an RPC `delete_self_account()` (created below) and signs out on success.
- [X] **T042** Create `supabase/migrations/0013_delete_self_account.sql` defining `public.delete_self_account()` as `SECURITY DEFINER` that deletes `auth.users` where `id = auth.uid()`. Add a comment noting the cascade FKs (set up in feature 001) handle the rest. Grant `EXECUTE` to `authenticated`. — **DONE 2026-05-17** (renumbered from 0014 → 0013 since T033's migration was skipped). SettingsPage `deleteAccount()` updated to call the RPC instead of the previous best-effort profile delete.
- [X] **T043** Apply migration and smoke-test from the frontend that calling the RPC ends the session and the user's rows are gone (run a `select count(*) from user_progress where user_id = …` via MCP after).
- [X] **T044** Add the `/settings` route + a "Settings" entry in `<ProfileMenu>`.

**Checkpoint**: US3 complete — display name persists, deletion cascades cleanly.

## Phase 5 — Tests

- [X] **T050** [P] `frontend/tests/unit/env-validation.test.ts` — verify `env.ts` throws when required vars are absent and exposes them when present.
- [X] **T051** [P] `frontend/tests/unit/migration-plan.test.ts` — given a fixture localStorage shape, `buildMigrationPlan` returns the right counts + stable idempotency key.
- [X] **T052** [P] `frontend/tests/unit/migration-merge.test.ts` — table-driven cases for `mergeProgress`: higher `times_seen` wins, newer `last_rating` wins, sessions union de-duplicates by id.
- [X] **T053** [P] `frontend/tests/unit/migration-execute.test.ts` — mock the Supabase client; assert `executeMigration` is idempotent across two consecutive runs with the same plan (zero duplicates on the second pass).
- [X] **T054** `frontend/tests/integration/auth-migration.test.ts` (gated by `SUPABASE_TEST_*` env vars): seed localStorage with 3 progress rows, sign in a fresh test user via `auth.admin.createUser`, run the migration flow, assert the rows land in Supabase under the new `user_id`. Skip when env not present.
- [X] **T055** Run `pnpm -C frontend test` and `pnpm -C frontend lint`. Resolve any failures.

## Phase 6 — Manual verification

- [X] **T060** `pnpm -C frontend dev`. As a guest, complete one flashcard / progress action so localStorage has data. Sign in with a real email. Confirm the migration prompt summarizes correct counts.
- [X] **T061** Accept the migration; verify in Supabase Studio (or `mcp__supabase__execute_sql`) that the rows landed under the new `user_id` and localStorage progress is cleared.
- [X] **T062** Re-trigger the sign-in flow (sign out + sign in again) on the same browser: confirm the migration prompt does NOT re-appear.
- [X] **T063** Edit display name in `/settings`, reload, confirm it persists. Then delete the account and confirm: (a) the session ends, (b) re-signing in with the same email yields a fresh empty account.
- [X] **T064** Inspect the production bundle (`pnpm -C frontend build`) and confirm the service-role key string does NOT appear anywhere (`grep -r "service_role" frontend/dist || true`).

## Phase 7 — Cleanup

- [X] **T070** Update the feature 003 checklist to mark resolved items.
- [X] **T071** Note in `frontend/README.md` the env vars required for local dev and the location of the magic-link redirect.
- [X] **T072** If the constitution still references AZ-104 anywhere relevant to auth copy, queue a follow-up rename (out of scope here, but capture as a one-liner).

## Dependencies summary

- Phase 1 blocks everything.
- US1 (Phase 2) blocks US2 (Phase 3) — migration needs a working auth state.
- US3 (Phase 4) is independent of US2 and can be implemented in parallel by a second developer.
- Phase 5 tests can be written in parallel with their respective implementation phases.
