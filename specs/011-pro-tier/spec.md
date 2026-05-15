# Feature Specification: Pro Tier (Cosmetic Entitlements via Stripe)

**Feature Branch**: `011-pro-tier`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "Free + paid 'Pro' cosmetic tier (~$3/mo) with themes, advanced stats, exam-day countdown" (resolved decision #2)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A Free Learner Can Upgrade to Pro and Get Cosmetic Perks Immediately (Priority: P1)

A signed-in learner taps "Upgrade to Pro" from the settings screen. The Stripe checkout opens; after successful payment, the learner returns to the app and their account is marked Pro within a few seconds. Pro-only UI (theme picker beyond the default two themes, advanced stats panel, exam-day countdown widget) becomes available. No core study functionality is gated.

**Why this priority**: Resolved decision #2 commits to a paid tier, but only cosmetic features are gated. The whole point of P1 here is to prove the checkout → entitlement → UI loop end to end with a small set of Pro features. Without it, the tier exists only on paper.

**Independent Test**: As a signed-in free user, tap Upgrade. Complete a Stripe test-mode checkout. Return to the app. Within 10 seconds, verify the theme picker exposes more than two options, the advanced stats panel renders on `/progress`, and the exam-day countdown widget can be enabled in `/settings`. Verify that a guest (not signed in) cannot upgrade — the Upgrade CTA prompts sign-in first.

**Acceptance Scenarios**:

1. **Given** a signed-in free user, **When** they tap "Upgrade to Pro," **Then** the Stripe checkout opens with the configured price.
2. **Given** a successful payment, **When** the user is returned to the app, **Then** the entitlement updates within 10 seconds and the Pro-only UI surfaces become visible.
3. **Given** a guest user, **When** they tap "Upgrade to Pro," **Then** they are routed through sign-in first; only after sign-in is the checkout offered.
4. **Given** a Pro user, **When** they visit any free user-flow (start a session, view dashboard), **Then** they receive the exact same experience as a free user plus the Pro-only surfaces — no feature is taken away or downgraded.

---

### User Story 2 — A Pro Learner Can Cancel, Update Payment, and Sees Accurate State (Priority: P1)

A Pro learner can open a "Billing" sub-screen in settings that shows their plan, renewal date, and a "Manage subscription" button that opens the Stripe customer portal. They can cancel, update their payment method, or view past invoices from the portal. When they cancel, their Pro status remains active until the end of the current period; after expiry, the Pro UI disappears and the theme/widget choices revert to free defaults.

**Why this priority**: Without a clear cancel/billing surface, the tier is hostile to users (and to consumer-protection laws in many regions). P1 because it's table stakes for a paid tier and a launch blocker.

**Independent Test**: Subscribe in test mode. Open Billing. Cancel via the customer portal. Verify the app shows "Your Pro plan ends on YYYY-MM-DD." After (simulated) expiry, verify the entitlement updates within five minutes of the webhook firing and the Pro-only UI is hidden.

**Acceptance Scenarios**:

1. **Given** a Pro user, **When** they open Settings → Billing, **Then** their plan name, renewal date, and "Manage subscription" CTA are visible.
2. **Given** they cancel via the customer portal, **When** they return to the app, **Then** the Billing screen reflects the cancellation and the renewal date is replaced with "Expires YYYY-MM-DD."
3. **Given** the subscription expires, **When** the entitlement webhook fires, **Then** the user's Pro status flips off within five minutes and the Pro-only UI is hidden.
4. **Given** a payment method is declined at renewal, **When** Stripe retries fail, **Then** the user is informed in-app and Pro UI is hidden after the configured grace period.

---

### User Story 3 — Pro Surfaces Are Discoverable Without Being Pushy (Priority: P2)

Free users can discover Pro through subtle entry points: a small "Pro" tag next to gated theme swatches in settings, a "Pro" lock icon on the advanced stats card on the dashboard, and a one-tap "What's in Pro?" surface from the upgrade CTA. The surface explains the value at a glance and is clearly cosmetic-only ("Pro is about making the app yours — nothing about studying is paywalled").

**Why this priority**: Pricing the wrong way kills both adoption and trust. The explicit framing ("nothing about studying is paywalled") is the bar resolved decision #2 set. P2 because the loop in US1 works without polished discovery, but the discovery surface is the lever that drives conversion at scale.

**Independent Test**: As a free user, navigate to settings, dashboard, and the upgrade CTA. Verify the Pro tag/lock indicators are present, the "What's in Pro?" surface lists exactly the Pro features and explicitly states no study content is gated, and the upgrade CTA appears in at most two distinct in-app locations (no banner ads, no modals).

**Acceptance Scenarios**:

1. **Given** a free user, **When** they open settings, **Then** at least one Pro theme swatch has a visible "Pro" tag with a hover/long-press explanation.
2. **Given** a free user, **When** they open the dashboard, **Then** the advanced stats card shows a lock icon and a brief preview of what Pro unlocks.
3. **Given** a free user, **When** they tap "What's in Pro?," **Then** a surface lists every Pro-only feature explicitly and states that no study content is paywalled.

---

### Edge Cases

- **A user upgrades on device A and opens device B**: the entitlement is visible on device B within the same five-second budget as US1 once the webhook fires.
- **Stripe webhook delivery is delayed**: the app falls back to polling the entitlement on each app launch; eventual consistency is bounded at five minutes.
- **A user's subscription is force-canceled by Stripe (chargeback)**: their Pro status is revoked immediately and they're informed in-app.
- **A guest tries to access a Pro feature**: they're prompted to sign in first; Pro is only purchasable by authenticated users.
- **A user with a Pro subscription deletes their account**: the deletion cascades through `profiles`, `user_progress`, `sessions`, and also schedules a subscription cancellation; refunds (if any) are out of scope and handled manually.
- **A user is in a region Stripe doesn't support**: the upgrade CTA is hidden and replaced with a "Coming soon" surface.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Only authenticated users MAY purchase Pro; the upgrade CTA MUST first route guests through sign-in.
- **FR-002**: The upgrade CTA MUST live in at most two places: `/settings` and the Pro discovery surface (US3). It MUST NOT appear as a modal, banner, or interruption on study screens.
- **FR-003**: Checkout MUST use Stripe's hosted checkout flow; no card data ever touches this app.
- **FR-004**: The app MUST listen for Stripe webhooks (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`) to update the user's entitlement.
- **FR-005**: A user's entitlement state MUST be persisted in Supabase (a `subscriptions` table keyed by user id) and MUST be readable by the user's own session via RLS.
- **FR-006**: The app MUST also fall back to polling the entitlement on each app launch in case a webhook is missed; the polled state MUST converge with the webhook-driven state within five minutes.
- **FR-007**: Pro-only surfaces are: (a) theme picker beyond the default Dark/Light pair (at least two additional themes), (b) an "Advanced stats" panel on the dashboard, (c) an exam-day countdown widget configurable in `/settings`.
- **FR-008**: NO core study functionality is Pro-gated. Every game mode, every question, every dashboard insight available to free users MUST be available to Pro users identically.
- **FR-009**: A "Billing" sub-screen MUST live under `/settings` and MUST show: current plan, renewal or expiry date, and a "Manage subscription" button that opens the Stripe customer portal.
- **FR-010**: Cancellation MUST preserve Pro access until the end of the current paid period; the entitlement flips off only after expiry.
- **FR-011**: A "What's in Pro?" surface MUST list every Pro feature explicitly and MUST state in plain language that no study content is paywalled.
- **FR-012**: Pro indicators (tag, lock icon) MUST appear next to gated cosmetic features for free users and MUST NOT appear for Pro users.
- **FR-013**: Account deletion MUST schedule a subscription cancellation as part of the same operation; the entitlement is revoked at deletion time.
- **FR-014**: All Stripe-related secrets (secret key, webhook signing secret, price ID for production) MUST be configured server-side or in the platform's secret store; no Stripe secret MUST ever be present in the client bundle.
- **FR-015**: The visible price MUST be loaded from Stripe at runtime, not hard-coded, so regional pricing and currency are correct.

### Key Entities

- **Subscription**: One row per (user, lifecycle) — plan, status (active / past_due / canceled / expired), current period end, Stripe IDs. Owned by the user; RLS-scoped.
- **Entitlement**: A computed boolean (or set of boolean feature flags) derived from `Subscription.status` and `current_period_end`. Cached in app state with the five-minute polling fallback.
- **WebhookEvent**: An audit-log entry for every Stripe webhook received; used for replay debugging.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from "tap Upgrade" to "Pro UI visible" in under 30 seconds end-to-end (including the Stripe checkout) on a typical mobile connection.
- **SC-002**: Entitlement state converges on every device within five minutes of any change (subscribe, cancel, expire), in 100% of test runs.
- **SC-003**: Zero core study features are Pro-gated; verified by an explicit checklist in the implementation plan.
- **SC-004**: A canceled user retains Pro access until the configured `current_period_end` and loses it within five minutes after.
- **SC-005**: 0 Stripe secrets appear in any client bundle, verified by repo-wide grep against the committed artifacts.
- **SC-006**: The Pro discovery surface is reachable from `/settings` and `/progress` only — verified by route audit.

## Assumptions

- Stripe is the only payment provider for v1. Switching providers later requires a new feature.
- The default price is ~$3/month USD. Currency conversion and regional pricing are managed in the Stripe dashboard, not in app code.
- The "two additional themes" requirement is a v1 floor; more themes can be added without re-spec.
- The "Advanced stats" panel scope (which charts are Pro vs. free) is settled in this feature's implementation plan; this spec only requires *some* Pro-only stats.
- The exam-day countdown widget needs the learner to configure an exam date in settings; if no date is set, the widget hides itself.
- Free users still see streak, XP, level, domain radar, weak-areas list, and 12-week activity calendar from feature 007. Pro adds insights, not table stakes.
- Refunds, partial refunds, and chargebacks are handled in the Stripe dashboard manually; no in-app refund UI in v1.
- The app does not collect or store any card data; PCI compliance is delegated entirely to Stripe.
