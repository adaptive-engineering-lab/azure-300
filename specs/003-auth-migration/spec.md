# Feature Specification: Supabase Auth and Guest → Account Migration

**Feature Branch**: `003-auth-migration`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "Supabase Auth (email magic link) + guest→authenticated progress migration" (Phase 1 of AI300-Game-Spec.md §13, closing resolved decision #1)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A Guest Can Sign In With an Email Magic Link (Priority: P1)

A guest visitor decides to sign in. They tap "Sign in" from the home screen, enter their email address, and receive a magic-link email. Tapping the link in the email signs them in — no password to remember. After sign-in, the app shows them as authenticated: a profile menu replaces the "Sign in" CTA, and their session persists across reloads until they explicitly sign out.

**Why this priority**: Without sign-in, no learner can study across devices or recover progress after clearing their browser. Magic link is the lowest-friction option (no passwords, no MFA setup) and matches the "Career Switcher / IT Pro / Student" persona expectation of "tap to learn." This story delivers a complete usable auth surface.

**Independent Test**: Open the app as a guest. Enter a working email. Confirm the email arrives within a minute, contains a clearly-branded link, and that tapping the link signs the user in. Confirm sign-out clears the session and returns the app to guest state.

**Acceptance Scenarios**:

1. **Given** a guest visitor on the home screen, **When** they tap "Sign in" and enter their email, **Then** an email with a magic link is dispatched and the UI confirms it was sent.
2. **Given** the user receives the email, **When** they tap the magic link, **Then** they are signed in and returned to the app with their account active.
3. **Given** a signed-in user, **When** they reload the page, **Then** they remain signed in (the session persists).
4. **Given** a signed-in user, **When** they tap "Sign out," **Then** the session is cleared and the home screen reflects the guest state.

---

### User Story 2 — Guest Progress Migrates Into the Account on First Sign-In (Priority: P1)

A guest who has been studying without an account decides to sign in for the first time. On successful sign-in, the app detects local-storage progress, prompts the user once with a clear summary ("Save your 32 reviewed questions, 4-day streak, and 240 XP to your account?"), and on confirmation copies every guest record into the authenticated tables in Supabase, scoped to their new user id. The local-storage copy is cleared after a successful migration to prevent drift.

**Why this priority**: Resolved decision #1 explicitly commits to "Guest mode with local storage; optional sign-in later migrates progress to Supabase." Without this migration, sign-in destroys value (the user loses their work) and adoption stalls. P1 because it's the bridge that makes the guest model viable in the long term.

**Independent Test**: As a guest, generate at least 3 progress entries and one session record. Sign in. Confirm the migration prompt summarizes correct counts. Accept it. Verify that the records appear in the authenticated tables for the new user id, that the values are identical to the guest entries, and that local storage no longer contains them.

**Acceptance Scenarios**:

1. **Given** a guest with progress and session records, **When** they sign in successfully for the first time, **Then** the app prompts them once with accurate counts and asks for confirmation.
2. **Given** they confirm the migration, **When** it completes, **Then** the authenticated `user_progress` and `sessions` tables contain every guest record bound to the new `user_id`, with no data loss.
3. **Given** the migration succeeds, **When** the local-storage namespace is inspected, **Then** the progress and session entries are removed; preferences (theme, default session length) are retained.
4. **Given** the migration is interrupted (network drops mid-flight), **When** the user retries sign-in, **Then** the prompt reappears and the migration is idempotent — no duplicates land in Supabase.
5. **Given** a guest who declines the migration prompt, **When** they continue signed in, **Then** their authenticated tables start empty; local-storage progress is kept for a configurable grace period in case they change their mind.

---

### User Story 3 — A Signed-In User Can Manage Their Profile (Priority: P2)

A signed-in user can edit their display name in `/settings`, view their email and last-active date, and delete their account. Account deletion is two-step (confirm the action by typing a phrase) and cascades to remove all progress, sessions, and profile data from Supabase.

**Why this priority**: Profile management is table stakes for any account-bearing app and a compliance baseline (right-to-be-forgotten). P2 because it is not required for the migration flow — users can sign in and migrate without ever touching settings — but is needed before any external launch.

**Independent Test**: Sign in, navigate to settings, edit the display name, confirm the change persists across reloads. Then delete the account, confirm the user is signed out, and verify that re-signing in with the same email produces a fresh account with no remaining records.

**Acceptance Scenarios**:

1. **Given** a signed-in user with the default empty display name, **When** they set a display name in settings, **Then** the new value persists in Supabase and is visible across devices.
2. **Given** a signed-in user, **When** they initiate account deletion, **Then** a confirmation step blocks the action until they explicitly confirm.
3. **Given** they confirm deletion, **When** the operation completes, **Then** they are signed out, and all rows belonging to their user id (`profiles`, `user_progress`, `sessions`) are removed by cascade.

---

### Edge Cases

- **Email magic link delivery delay**: If the email takes more than 60 seconds, the app surfaces a "resend" option after that timeout.
- **User taps a magic link that has already been used or has expired**: Show a clear "this link expired — request a new one" state with one tap to resend.
- **Sign-in happens on a different device than where the guest progress lives**: The migration prompt does not appear because there's nothing local to migrate. No data is silently created or destroyed.
- **The user already has an authenticated account from a previous device**: First sign-in on a new device with local guest progress prompts: "Merge your local progress with your existing account?" Confirmation triggers the same migration path, with conflicts (same `question_id`) resolved by keeping the higher `times_seen` and most recent `last_rating`.
- **A user signs in, declines migration, and then their local-storage grace period expires**: Local progress is cleared. The next sign-in shows no migration prompt because there's nothing to migrate.
- **Rate limiting**: Repeated magic-link requests for the same email within a minute are throttled with a clear user-facing message.
- **A signed-in user opens the app in a new browser**: They see only the data they had migrated; any guest progress in the new browser is treated as a fresh guest session until they trigger a sign-in or migration there too.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST offer sign-in via email magic link as the primary authentication mechanism.
- **FR-002**: The sign-in flow MUST tolerate the user closing the tab between requesting the magic link and tapping it — opening the magic link in a new tab MUST complete sign-in regardless of where the request originated.
- **FR-003**: Once signed in, the session MUST persist across page reloads and browser restarts until the user explicitly signs out or the session expires per the platform's default policy.
- **FR-004**: An authenticated user MUST see their authenticated state (profile menu, sign-out option) instead of guest CTAs in the UI.
- **FR-005**: On a user's first sign-in from a browser that contains guest-mode local-storage progress, the app MUST present a one-time migration prompt summarizing the records that will be copied and asking for explicit confirmation.
- **FR-006**: On migration confirmation, the app MUST copy every guest `user_progress` and `sessions` record into the corresponding authenticated tables, bound to the new authenticated user id.
- **FR-007**: Migration MUST be idempotent: a partial or interrupted migration that is retried MUST NOT produce duplicate rows in Supabase.
- **FR-008**: After a successful migration, the app MUST clear the migrated guest progress and session records from local storage. Session preferences MUST be retained.
- **FR-009**: If the user declines the migration prompt, the app MUST retain the local-storage guest progress for a configurable grace period (default 14 days), after which it is cleared automatically.
- **FR-010**: If the user already has authenticated rows in Supabase when they sign in on a new browser with local guest progress, the migration MUST present a merge prompt with conflict-resolution rules: prefer higher `times_seen`, more recent `last_rating`, and union of session records.
- **FR-011**: Signed-in users MUST be able to edit their display name in `/settings`, with changes persisted to the authenticated `profiles` table.
- **FR-012**: Signed-in users MUST be able to delete their account from `/settings` via a two-step confirmation flow.
- **FR-013**: Account deletion MUST remove the user's auth identity and cascade-delete all their `profiles`, `user_progress`, and `sessions` rows.
- **FR-014**: Magic-link requests MUST be rate-limited per email to prevent abuse, with a clear user-facing message when the limit is hit.
- **FR-015**: All authentication-related UI MUST meet WCAG 2.1 AA contrast and keyboard-navigation requirements per resolved decision #5.

### Key Entities

- **AuthSession**: A learner's current authenticated session — token, expiry, user id. Lives in the browser session store.
- **MigrationPlan**: A computed summary of records to be migrated from local storage to Supabase — counts, conflict candidates if any, and the operation's idempotency key.
- **ProfileEdit**: A change to the authenticated `profiles` row — display name only in this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can complete first-time sign-in from requesting the magic link to landing in the signed-in app in under 60 seconds on a typical mobile connection (assuming the email arrives within 30 seconds).
- **SC-002**: 100% of guest progress and session records present at the moment of confirmed migration appear in the authenticated tables with matching field values, verified by post-migration audit.
- **SC-003**: A migration retried after an interrupted run produces zero duplicate rows in Supabase, verified by row-count comparison before and after retry.
- **SC-004**: A user who deletes their account leaves zero rows behind in `profiles`, `user_progress`, or `sessions` for their former user id, verified by an authenticated read.
- **SC-005**: Magic-link rate limiting blocks the second request for the same email within 60 seconds, with a user-facing message rendered.
- **SC-006**: Account deletion completes within five seconds end-to-end on a typical connection.

## Assumptions

- The auth provider is Supabase Auth, locked by the constitution.
- Email magic link is the only sign-in method shipped here; Google OAuth or password sign-in are out of scope unless a future feature reopens the question.
- Guest progress lives in local storage per feature 002. Migration moves data into the authenticated tables defined in feature 001.
- Migration runs entirely in the client (signed-in browser) using the authenticated user's session — no server-side migration job. This avoids needing a service-role key in any frontend code.
- The 14-day declined-migration grace period is a default; user-configurable values are out of scope.
- Conflict resolution rules (prefer higher `times_seen`, etc.) are settled here and out of scope for `/speckit-clarify`.
- Email deliverability is bounded by Supabase's default sender configuration; custom domains and email-template editing are out of scope for this feature.
- Display name is the only profile field editable in this feature. Avatar, bio, and other profile fields are not in v1.
- The constitution's Principle IV is honored: the `service_role` key never appears in any client bundle. All auth and migration use the `anon` key plus the user's authenticated session.
