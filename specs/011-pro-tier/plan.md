# Implementation Plan: Pro Tier (Cosmetic Entitlements via Stripe)

**Branch**: `011-pro-tier` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)

## Summary

Add a ~$3/month "Pro" tier that unlocks cosmetic-only features: extra themes, an Advanced Stats panel on the dashboard, and an exam-day countdown widget. Strictly no core study features are gated. The flow uses Stripe Hosted Checkout + Customer Portal (no card data ever touches the app), a Supabase `subscriptions` table for entitlement state, a Supabase Edge Function for webhook handling (signature-verified), and a 5-minute polling fallback on app launch. The Pro discovery surface explicitly states "no study content is paywalled."

## Technical Context

**Language**: TypeScript 5.5 + React 18.3 (client); TypeScript on Deno (Supabase Edge Function)
**New deps**: `@stripe/stripe-js@^4` (client), `stripe@^17` (edge function), `@supabase/functions-js` (already present transitively)
**Env vars**:
- Client: `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_STRIPE_PRICE_ID`
- Edge function: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`
- All non-client secrets live in Supabase project secrets; NEVER bundled
**Storage**: new `public.subscriptions` table + `public.webhook_events` audit log
**Testing**: vitest for entitlement derivation + the polling fallback; manual Stripe test-mode end-to-end
**Project**: extends `frontend/` + a new `supabase/functions/stripe-webhook/`

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-First UX | Pass | Discovery surface is a single scroll-card; checkout is Stripe-hosted (mobile-optimized by default). |
| II. Domain-Aligned Content | N/A | No content. |
| III. AI as Authoring Tool | Pass | No runtime AI. |
| IV. Secrets Stay Server-Side | Pass | Stripe secret + webhook secret + service role live in Supabase project secrets; only publishable key + price ID in the client bundle. SC-005 verifies. |
| V. Measurable Quality Gates | Pass | SC-001 bounds end-to-end checkout < 30 s; SC-002 bounds entitlement convergence at 5 min. |

## Project Structure (additions)

```
frontend/
└── src/
    ├── pages/
    │   ├── BillingPage.tsx                       # was a placeholder in feature 003 — fills here
    │   └── WhatsInProPage.tsx                    # discovery surface
    ├── components/
    │   ├── UpgradeCta.tsx                        # the only two CTA entry points
    │   ├── ProBadge.tsx                          # tag/lock indicator
    │   ├── ExamCountdownWidget.tsx               # /settings configurable
    │   ├── AdvancedStatsPanel.tsx                # /progress addition
    │   └── ProThemeSwatch.tsx                    # /settings extra themes (gated)
    └── lib/
        └── billing/
            ├── stripe.ts                         # loadStripe singleton w/ publishable key
            ├── entitlements.ts                   # subscriptions row → Entitlement; 5-min polling fallback
            ├── useEntitlement.ts                 # hook + supabase realtime subscription
            └── checkout.ts                       # invokes the edge function to create a Checkout Session

supabase/
├── migrations/
│   ├── 0015_subscriptions.sql                    # subscriptions + RLS
│   └── 0016_webhook_events.sql                   # audit log (service-role only)
└── functions/
    └── stripe-webhook/
        ├── index.ts                              # signature verification + upsert subscriptions
        ├── deno.json
        └── README.md
```

## Phases

1. **DB schema** — `subscriptions` (RLS-scoped to the user) + `webhook_events` (no client RLS access).
2. **Edge function: webhook receiver** — signature-verified; idempotent on `event.id`; updates the user's `subscriptions` row.
3. **Edge function: create-checkout-session** — server-side helper because we want a single Stripe Customer per user and we don't trust the client with the price-to-Customer mapping.
4. **Client entitlement layer** — `useEntitlement()` reads from `subscriptions` and exposes `{ isPro, periodEnd, status }`; subscribes to Supabase realtime for fast convergence; polls every 5 minutes as a fallback.
5. **Upgrade flow** — `UpgradeCta` → `createCheckoutSession` → Stripe-hosted page → return to app → entitlement webhook flips state.
6. **Billing screen + Customer Portal** — `/settings/billing` shows the plan + a "Manage subscription" button that opens the Stripe Customer Portal.
7. **Pro-only surfaces** — extra themes, advanced stats, exam-day countdown widget — each conditionally rendered on `isPro`.
8. **Discovery surface** — `WhatsInProPage` lists every Pro feature and the "nothing is paywalled" statement.
9. **Tests + verification** — Stripe test-mode end-to-end; subscribe → confirm → cancel → confirm-expiry behavior.

## Complexity Tracking

The webhook → entitlement loop is the highest-risk part of this feature. We accept the complexity because the alternative (polling-only) violates SC-002.

| Decision | Why |
|---|---|
| Supabase Edge Function as the webhook receiver | Allows verifying Stripe signatures server-side without standing up a separate backend. |
| Both webhook AND polling | Webhooks can be delayed/dropped; polling is the safety net (FR-006). |
| Entitlement persists in Supabase, not localStorage | Cross-device convergence (SC-002, spec edge case 1). |
| Stripe Hosted Checkout, not Elements | Eliminates PCI scope entirely; matches FR-003. |
