# Feature Specification: React Scaffold, Routing, and Guest Progress Store

**Feature Branch**: `002-react-scaffold`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "React app scaffold + routing + guest-mode local-storage progress store" (Phase 1 of AI300-Game-Spec.md §13)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Anyone Can Open the App and Navigate Around (Priority: P1)

A first-time visitor opens the app's URL on their phone and lands on a clear, mobile-first home screen that explains what the app does and offers a single primary call-to-action. They can navigate to placeholder game-mode screens, a progress screen, and a settings screen via in-app navigation — every route renders cleanly even with no prior data.

**Why this priority**: Nothing else can be built without a navigable shell. This story delivers the smallest non-zero amount of user value: a learner can see the product, understand what it offers, and discover where the future game modes will live.

**Independent Test**: Open the app on a phone-sized viewport. Verify the home screen renders, the primary CTA is reachable in the bottom 60% of the viewport, and each top-level route (`/`, `/learn`, `/progress`, `/settings`) loads without errors or empty-state crashes. Verify the active route is reflected in the navigation.

**Acceptance Scenarios**:

1. **Given** a new visitor with no prior data, **When** they open `/`, **Then** the home screen renders with the app's purpose, the primary CTA, and the streak/XP indicators showing zero state.
2. **Given** the home screen, **When** the visitor taps the primary CTA, **Then** they land on `/learn` and see placeholder cards for each game mode the product will ship.
3. **Given** any route, **When** the visitor uses the in-app navigation, **Then** the URL updates, the new screen renders, and browser back/forward navigation works.

---

### User Story 2 — A Returning Visitor's Preferences and Stats Persist (Priority: P2)

A visitor who has used the app before — without signing in — returns and finds their preferences (theme, default session length, default starting mode), their streak counter, their XP total, and any per-question progress they generated still present. Closing the browser and re-opening does not reset them.

**Why this priority**: Persistence is what makes the guest-mode experience habit-forming. Without it, every visit is a fresh start and the gamification loop never closes. It also makes the eventual sign-in migration meaningful — there's something worth migrating.

**Independent Test**: Set a non-default theme and complete a synthetic action that writes a progress entry. Close the tab. Open the app again. Verify the theme is restored, the progress entry is readable, and the streak/XP counters reflect the prior action.

**Acceptance Scenarios**:

1. **Given** a returning visitor who previously set dark mode, **When** they reopen the app, **Then** dark mode is applied before any flash of incorrect theme.
2. **Given** a visitor who completed a synthetic study action yesterday, **When** they open the app today, **Then** their streak counter reads 1, and on a third consecutive day reads 2.
3. **Given** a visitor whose browser blocks local storage (private mode), **When** they open the app, **Then** the app loads normally and operates with session-only state, with no errors surfaced to the user.

---

### User Story 3 — Guest Progress Is Shaped to Match the Future Authenticated Store (Priority: P3)

Per-question progress entries written by a guest learner conform to the same JSON shape as the authenticated `user_progress` schema from feature 001. A future sign-in/migration flow (feature 003) can copy guest data into Supabase row-for-row, mapping each guest entry to the new authenticated user, without re-shaping fields or losing data.

**Why this priority**: Resolved decision #1 commits the product to a guest-mode-first model with an optional sign-in migration. If the guest store has a different shape than the authenticated one, the migration becomes a translation layer that drifts. Locking the shape now is one small constraint applied to one feature instead of a refactor later.

**Independent Test**: Inspect a guest progress entry written by the app and compare its field names, types, and value ranges to the `user_progress` table's columns. Every field present in the table must be present in the entry, with the same meaning. Fields that the authenticated table requires but guest mode cannot supply (e.g., `user_id`) are explicitly tagged so the migration step can populate them.

**Acceptance Scenarios**:

1. **Given** a guest who has rated a flashcard "correct," **When** the resulting entry is inspected, **Then** it contains `question_id`, `times_seen`, `times_correct`, `last_rating`, `next_review`, and `updated_at` with the same types as the authenticated table.
2. **Given** a guest session record, **When** inspected, **Then** it contains `mode`, `topic`, `score_pct`, `duration_seconds`, and `completed_at` with the same types and value constraints as the authenticated `sessions` table.

---

### Edge Cases

- **Local storage disabled or blocked**: The app loads, operates with session-only memory, and warns the user (one-time, dismissible) that progress will not persist across reloads.
- **Local storage quota exceeded**: New writes succeed; older entries are pruned LRU. Pruning is invisible to the user.
- **Stored data was written by an older app version with a different schema**: The app detects the version mismatch, migrates entries in place if possible, or clears the namespace and starts fresh with a non-blocking notice.
- **Two browser tabs open simultaneously**: Writes from one tab are visible to the other within five seconds.
- **A guest deletes their browser data**: Progress is lost; the app does not present an error, just the new-visitor state. Sign-in is positioned as the way to prevent this loss.
- **Visiting on a viewport narrower than 320px**: The layout remains usable; nothing is clipped off-screen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST serve a home route (`/`) that renders a landing screen with the product name, a one-sentence value statement, current streak and XP indicators, and a single primary CTA.
- **FR-002**: The app MUST expose at least the following routes, each of which renders without error on first visit: `/`, `/learn`, `/learn/flashcards`, `/learn/quiz`, `/learn/product-id`, `/progress`, `/settings`.
- **FR-003**: Game-mode routes that are not yet implemented MUST render an explicit "coming soon" placeholder rather than crashing or 404-ing.
- **FR-004**: In-app navigation between routes MUST be reflected in the URL and MUST preserve browser history (back/forward work).
- **FR-005**: The app MUST be mobile-first: it MUST render correctly at 375px width and degrade gracefully down to 320px width.
- **FR-006**: Primary interactive controls MUST appear in the bottom 60% of the viewport on mobile breakpoints.
- **FR-007**: Dark mode MUST be the default theme; theme MUST be configurable from `/settings` and the choice MUST persist.
- **FR-008**: The app MUST track and persist guest session preferences (theme, default session length, default starting mode), guest profile state (streak days, XP, current level), per-question progress entries, and completed session records.
- **FR-009**: Guest progress entries MUST share field names and types with the authenticated `user_progress` table from feature 001 (excluding `user_id`, which is populated only on migration to an authenticated account).
- **FR-010**: Guest session records MUST share field names and types with the authenticated `sessions` table from feature 001 (excluding `user_id`).
- **FR-011**: Persistence MUST be implemented via the browser's local storage API, with all keys namespaced under a single app-specific prefix to avoid collisions with other site data.
- **FR-012**: If local storage is unavailable (private mode, quota exhausted, browser policy), the app MUST continue to function with session-only in-memory state and surface a single dismissible notice explaining that progress will not persist.
- **FR-013**: The stored state MUST carry a schema version number; on read, the app MUST detect a mismatch and either migrate in place or clear the namespace gracefully.
- **FR-014**: Initial JavaScript bundle for `/` MUST stay under 250 KB gzipped to support fast first paint on 4G connections.
- **FR-015**: All routes MUST be reachable via direct URL (deep-linking), not only via in-app navigation.

### Key Entities

- **SessionPreferences**: A learner's UI and session choices — theme, default session length (10/20/30 cards), default starting mode. One record per browser.
- **GuestProfile**: A guest learner's account-level state — streak days, XP total, current level, last-active date. Mirrors the authenticated `profiles` row shape minus `id` and `display_name`. One record per browser.
- **GuestProgress**: One entry per (browser, question) pair. Mirrors `user_progress` shape minus `user_id`.
- **GuestSession**: One entry per completed study session. Mirrors `sessions` shape minus `user_id`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The landing screen at `/` is interactive within two seconds on a mid-range mobile device on a 4G connection (measured from page-request to first-meaningful-input).
- **SC-002**: Lighthouse scores on `/` are at least 90 in each of Performance, Accessibility, Best Practices, and SEO categories.
- **SC-003**: Persisting and reading any guest record (preferences, profile, progress, session) completes in under 50 ms p95 on a typical phone.
- **SC-004**: A returning guest sees their theme applied before any visible flash of the wrong theme (no FOUC).
- **SC-005**: A guest progress record written by this feature, when inspected as JSON, validates against the `user_progress` shape used in feature 001 with zero field-name or type changes (excluding `user_id`).
- **SC-006**: Opening the app in a browser with local storage disabled produces zero JavaScript errors in the console and zero visible error states for the learner.
- **SC-007**: Direct navigation to any in-scope route by URL renders the correct screen — no redirects through `/`, no 404s for valid routes.

## Assumptions

- The frontend stack is locked by the constitution: React 18 + Vite, Tailwind, shadcn/ui, React Router, Zustand for state, Framer Motion for transitions.
- No authentication and no Supabase reads/writes happen in this feature. Auth and migration arrive in feature 003. The guest store is the only state.
- No game modes are playable yet. The mode routes render placeholders that explain what's coming. Each playable mode is its own later feature (004–006).
- No service worker, no offline shell, no PWA install prompt in this feature. PWA arrives in feature 010.
- Streak and XP counters are designed but not actually incremented in this feature — no game action exists yet to drive them. They render the zero state and the surrounding UI is in place; the increment logic lands with the game-mode features that produce activity.
- The English-only assumption from resolved decision #4 applies. No i18n framework is wired in.
- Accessibility commitment from resolved decision #5 begins to land here: the bare shell must pass WCAG 2.1 AA. The full per-flow commitment is enforced when the game-mode features ship.
- The browser-only persistence boundary keeps this feature out of Principle IV's scope for service-role keys — no privileged credentials are introduced.
