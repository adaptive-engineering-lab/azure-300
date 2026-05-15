# Feature Specification: PWA Shell, Dark Mode, and Design Refinement

**Feature Branch**: `010-pwa-dark-mode`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "Dark mode + design refinement + PWA manifest + mobile install prompt" (Phase 4 of AI300-Game-Spec.md §13)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A Learner Can Install the App on Their Phone (Priority: P1)

A learner visits the app on their phone. After spending a non-trivial amount of time studying (configurable threshold; default 3 minutes across one or more visits), the browser surfaces the native "Add to Home Screen" prompt for a PWA. Tapping accept installs the app; opening it from the home screen launches it in standalone mode (no browser chrome) with the brand splash visible during cold start.

**Why this priority**: A learner who installs the app is dramatically more likely to return. The PWA install path is the strongest retention lever short of native apps and matches the product spec's "no native app, PWA acceptable" decision. P1 because all the underlying PWA wiring (manifest, icons, service worker, theme color) lands together.

**Independent Test**: Visit the app on a mobile browser that supports PWA installs (Chrome on Android, Safari on iOS). Spend the configured threshold time on the site. Verify the install prompt is offered. Install. Open from home screen. Verify the app launches without browser chrome, the splash screen renders during cold start, and routing/state work identically to the web version.

**Acceptance Scenarios**:

1. **Given** a new visitor on a supported mobile browser, **When** they cross the configured engagement threshold, **Then** the install prompt surfaces (browser-native on Android; in-app instructions on iOS).
2. **Given** the install completes, **When** the learner opens the app from the home screen, **Then** it launches in standalone mode with the splash screen, the configured theme color in the status bar, and direct entry into the routed home screen.
3. **Given** the app is installed, **When** the maintainer ships a new version, **Then** the next launch picks up the new version after at most one reload, with no manual cache-clear required.

---

### User Story 2 — The App Works Offline for Already-Seen Content (Priority: P2)

A learner who has previously loaded the app can open it on the same device with no network connection and reach a useful state: cached UI loads, the bank's already-fetched questions remain available, and the local-storage progress store accepts ratings. Writes that require Supabase (authenticated learners) are queued and replayed when connectivity returns.

**Why this priority**: Offline use is one of the top three asks for any mobile study app — commute, flight, intermittent WiFi. P2 because the network-required v1 from features 001–008 is already useful for most learners; offline is the upgrade.

**Independent Test**: Load the app once on a phone while online. Put the device in airplane mode. Open the installed app. Verify the UI loads, at least one game-mode session can be started with previously-cached questions, and ratings are accepted (with a small "offline" indicator). Re-enable connectivity and verify any deferred writes propagate to Supabase.

**Acceptance Scenarios**:

1. **Given** the app has been loaded online at least once, **When** the device is offline and the app is opened, **Then** the UI loads from cache and a non-blocking "offline" indicator appears.
2. **Given** the learner starts a session offline, **When** they answer questions, **Then** the answers are recorded in the local store and the UI works exactly as online.
3. **Given** the learner authenticates and goes offline mid-session, **When** connectivity returns, **Then** any pending writes are replayed to Supabase and the indicator clears.

---

### User Story 3 — Dark Mode Is the Default and the Refinement Pass Tightens Visual Polish (Priority: P2)

The app defaults to a dark theme tuned for low-light study sessions. The palette uses an Azure-blue accent against a neutral dark background. A refinement pass tightens spacing, typography hierarchy, and motion across every existing screen, making the product feel cohesive rather than a collection of separately-built modules.

**Why this priority**: Dark mode itself is a small change (a theme toggle), but the design refinement is what differentiates the app from a "developer prototype" feel. P2 because every prior feature is functionally complete; this pass elevates the polish.

**Independent Test**: Walk the app's primary flows (home → learn → flashcard session → results → progress → settings). Verify dark mode is on by default, typography hierarchy is consistent, spacing is uniform across screens, and animations respect `prefers-reduced-motion`. Toggle to light mode in settings and verify no broken contrast.

**Acceptance Scenarios**:

1. **Given** a new visitor with no prior data, **When** they open the app, **Then** dark mode is applied immediately with no flash of light theme.
2. **Given** the learner switches to light mode in settings, **When** the preference persists, **Then** every screen in the app re-themes correctly and meets WCAG 2.1 AA contrast in light mode.
3. **Given** the learner has `prefers-reduced-motion` set, **When** they navigate the app, **Then** flip animations, transitions, and the install splash use reduced or no motion.

---

### Edge Cases

- **The browser does not support PWA installs (older browsers)**: the install prompt is hidden; the app continues to work as a regular web page.
- **The learner declines the install prompt**: it is not shown again for at least 14 days.
- **A service worker update fails to fetch**: the previous version remains active; no white-screen failures.
- **Cache exceeds the budget**: oldest cached assets are evicted first; questions in the bank are kept preferentially over UI assets.
- **The learner installs the app on multiple devices**: each device's offline cache is independent; queued writes from each device are merged at Supabase by the existing RLS-scoped writes (no merge conflicts because each device writes its own user's rows).
- **iOS does not surface the native PWA install prompt**: the app shows an in-app "Add to Home Screen" instruction card on Safari iOS.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST ship a valid PWA manifest (`/manifest.webmanifest`) with `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, `background_color`, and the standard icon sizes.
- **FR-002**: The app MUST register a service worker that caches the app shell on first visit and serves the cached shell on subsequent loads.
- **FR-003**: The service worker MUST update via the "skip waiting" pattern: a new version is detected on each visit and applied after at most one reload.
- **FR-004**: An in-app install prompt MUST be shown once a learner has crossed an engagement threshold (default: 3 minutes of cumulative time across visits), unless they have already installed or dismissed within the last 14 days.
- **FR-005**: When the network is unavailable, the cached app shell MUST load and a visible-but-non-blocking "offline" indicator MUST be shown.
- **FR-006**: All questions in the bank that have been fetched at least once MUST remain available offline; rating writes MUST be accepted to the local-storage store.
- **FR-007**: Pending authenticated writes that occurred offline MUST be queued and replayed automatically when connectivity returns.
- **FR-008**: Dark mode MUST be the default theme. Light mode MUST be available via the settings toggle.
- **FR-009**: Theme changes MUST be applied without a page reload and MUST meet WCAG 2.1 AA contrast in both modes.
- **FR-010**: The app MUST honor the `prefers-reduced-motion` setting: flip animations, screen transitions, and the install-splash motion MUST be reduced or eliminated when set.
- **FR-011**: The design refinement pass MUST achieve a consistent typography hierarchy (max three text scales per screen) and consistent spacing rhythm (4px / 8px grid) across all existing screens.
- **FR-012**: The PWA splash screen MUST display the brand logo and the configured theme color on cold start.
- **FR-013**: The service worker MUST NOT cache any authenticated user data (Supabase responses scoped to the user); only public anon reads (the question bank) and static assets are cacheable.
- **FR-014**: The total service-worker cache budget MUST be capped at 25 MB; older entries are evicted LRU.

### Key Entities

- **AppManifest**: The PWA manifest file's structured contents.
- **CacheBucket**: A named cache the service worker uses — "shell," "bank," "assets." Each has its own size budget and eviction policy.
- **PendingWrite**: A queued offline write for authenticated learners — `(table, op, payload, attempt-count, queued-at)`. Replayed when connectivity returns.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Lighthouse PWA audit reports "Installable" with no errors.
- **SC-002**: First-visit-to-install-prompt latency is ≥ 3 minutes by default; the prompt does not surface earlier.
- **SC-003**: A learner who installs the app and re-opens it offline reaches a non-error UI in under two seconds.
- **SC-004**: Lighthouse Performance + Accessibility + Best Practices + SEO ≥ 90 on the home screen, in both light and dark modes.
- **SC-005**: Pending offline writes are replayed within ten seconds of connectivity returning, in 100% of test runs.
- **SC-006**: Cache size remains under 25 MB after 100 simulated visits across the bank.

## Assumptions

- All prior features (002–008) honor the theme tokens this feature defines; if they don't, they're updated as part of the refinement pass.
- Service-worker tooling is `vite-plugin-pwa` or equivalent; the specific choice is in the implementation plan, not the spec.
- iOS Safari behavior diverges (no native install prompt, no full service-worker parity); an in-app instruction card covers it.
- The 14-day cooldown on declined install prompts is fixed for v1.
- The cache budget (25 MB) is the default; tuning is post-launch.
- Offline mode targets read-mostly use cases: studying already-seen content. Loading a brand-new question from the bank that hasn't been cached yet is not supported offline.
- No native iOS/Android wrappers are introduced — PWA only, per the constitution.
