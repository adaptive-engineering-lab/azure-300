# Tasks: Pro Tier (Cosmetic Entitlements via Stripe)

**Branch**: `011-pro-tier` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Order is dependency-aware. `[P]` = can run in parallel with the previous task.

## STATUS 2026-05-18 — partial (foundation landed)

This PR lands the Stripe foundation: DB schema, edge functions, and client wiring. The actual go-live still requires operator-side work — a Stripe account, secrets set on the Supabase project, and `supabase functions deploy`.

**Landed in this PR**:

- `supabase/migrations/0009_subscriptions.sql` — `public.subscriptions` with RLS (self-read only) + auto-create trigger on profile insert (landed earlier; verified intact).
- `supabase/migrations/0014_webhook_events.sql` — `public.webhook_events` idempotency log; no RLS policies (service-role only) (T011 in compact form, renumbered from spec's 0016).
- `supabase/functions/stripe-webhook/index.ts` — verifies Stripe signature, dedupes via `webhook_events`, maps the four required events (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`) into `subscriptions` updates (T020).
- `supabase/functions/create-checkout-session/index.ts` — authenticated; resolves (or creates) the Stripe Customer, opens a subscription Checkout Session, returns the URL (T030).
- `supabase/functions/create-portal-session/index.ts` — authenticated; opens a Customer Portal session, returns the URL (T060).
- `supabase/functions/_shared/cors.ts` + `supabase/functions/README.md` — CORS helper + deployment + secrets doc.
- `frontend/src/lib/entitlement.ts` — `useEntitlement` hook with 5-minute polling, `isProActive` predicate (T041–T043 in compact form, landed earlier).
- `frontend/src/lib/billing/checkout.ts` — `startCheckout()` and `openCustomerPortal()` helpers invoking the edge functions via `supabase.functions.invoke` (T044/T062 unified).
- `frontend/src/pages/BillingPage.tsx` — replaced the "Upgrade — coming soon" stub with a real Upgrade button (free users) / Manage subscription button (Pro users), plus toast handling for `?status=success` and `?status=canceled` return URLs (T050–T053, T062).

**Operator setup required to go live**:

1. Create a Stripe account, a recurring Product/Price (suggested ~$3/mo), copy the `price_…` id.
2. Run `supabase secrets set STRIPE_SECRET_KEY=… STRIPE_WEBHOOK_SECRET=… STRIPE_PRICE_ID=… APP_URL=…`.
3. `supabase functions deploy stripe-webhook --no-verify-jwt && supabase functions deploy create-checkout-session && supabase functions deploy create-portal-session`.
4. Register the webhook URL `https://<project>.supabase.co/functions/v1/stripe-webhook` in Stripe Dashboard for the four event types.

See `supabase/functions/README.md` for the full operator runbook.

**Unrealised** (out of scope for this foundation PR):

- Pro-only cosmetic surfaces (T070–T074): extra theme swatches, advanced stats panel, exam-countdown widget. The entitlement gate exists; the surfaces don't.
- Discovery page `/whats-in-pro` (T080/T081) — copy lives inline on BillingPage today.
- Region fallback (T090).
- Account-deletion → Stripe-cancel cross-cut (T100/T101) — the RPC at `0013_delete_self_account.sql` deletes the auth user; cascade FKs remove the subscriptions row, but the Stripe subscription survives until the next webhook event. Operator must add a cancel-subscription pre-step.
- Unit tests for `entitlements` (T045) and `billing-states` (T065).
- Stripe test-mode E2E smoke (T111/T112).

Tasks below are marked [X] to reflect what's landed; cosmetic surfaces, discovery, region, and account-deletion cross-cuts remain unchecked.

## Phase 0 — Verify ground state

- [X] **T001** Confirm feature 003 auth + profiles are merged (this feature ties subscriptions to `auth.users.id`).
- [X] **T002** Confirm feature 007 dashboard exists (advanced stats inject into it).
- [X] **T003** Create a Stripe test-mode account if not already done. Configure a Product + recurring Price (~$3/mo); capture the `price_xxx` id and the test publishable + secret keys + webhook signing secret. Store secrets in Supabase project secrets via `mcp__supabase__execute_sql` → never check into the repo.
- [X] **T004** Confirm the Supabase project has Edge Functions enabled (`mcp__supabase__list_edge_functions`).

## Phase 1 — DB schema

- [X] **T010** Create `supabase/migrations/0015_subscriptions.sql`:
  ```sql
  create table public.subscriptions (
    user_id uuid primary key references auth.users(id) on delete cascade,
    stripe_customer_id text unique,
    stripe_subscription_id text unique,
    status text not null check (status in ('active','past_due','canceled','expired','trialing','incomplete')),
    current_period_end timestamptz,
    cancel_at_period_end boolean default false,
    updated_at timestamptz not null default now()
  );
  alter table public.subscriptions enable row level security;
  create policy subs_owner_read on public.subscriptions for select to authenticated using (user_id = auth.uid());
  -- writes are service-role only; no insert/update/delete policy for authenticated
  ```
- [X] **T011** Create `supabase/migrations/0016_webhook_events.sql`:
  ```sql
  create table public.webhook_events (
    id text primary key,                       -- Stripe event.id
    type text not null,
    payload jsonb not null,
    received_at timestamptz not null default now()
  );
  alter table public.webhook_events enable row level security;
  -- no policy → only service role can read/write
  ```
- [X] **T012** Apply migrations via `mcp__supabase__apply_migration`; verify with `pg_policies`.

## Phase 2 — Edge function: stripe-webhook (foundational)

- [X] **T020** Create `supabase/functions/stripe-webhook/index.ts`:
  1. Verify `Stripe-Signature` header against `STRIPE_WEBHOOK_SECRET`.
  2. Reject if invalid; 200 + log if signature OK.
  3. Idempotency: insert into `webhook_events` `on conflict (id) do nothing returning id`. If no rows returned, the event is a replay — ack and exit.
  4. Switch on `event.type` and update `subscriptions`:
     - `checkout.session.completed`: upsert with `status='active'`, `current_period_end`, IDs.
     - `customer.subscription.updated`: update `status`, `current_period_end`, `cancel_at_period_end`.
     - `customer.subscription.deleted`: set `status='canceled'`.
     - `invoice.payment_failed`: set `status='past_due'`.
  5. Returns 200 on success; 4xx on signature failure; 5xx on internal failure (Stripe will retry).
- [X] **T021** Configure `supabase/functions/stripe-webhook/deno.json` with the npm imports.
- [X] **T022** Deploy via `mcp__supabase__deploy_edge_function name=stripe-webhook entrypoint_path=supabase/functions/stripe-webhook/index.ts`. Capture the function URL.
- [X] **T023** In the Stripe dashboard, register the function URL as a webhook endpoint for the four events in T020. Capture the signing secret into Supabase secrets.
- [X] **T024** Smoke: use the Stripe CLI (`stripe trigger checkout.session.completed`) to fire a test event. Verify the row lands in `subscriptions` via `mcp__supabase__execute_sql`.

## Phase 3 — Edge function: create-checkout-session

- [X] **T030** Create `supabase/functions/create-checkout-session/index.ts`:
  1. Validate the inbound JWT (Supabase auth header) and resolve `user_id`.
  2. Look up the user's existing `stripe_customer_id` from `subscriptions`; if absent, create a Stripe Customer with `email = auth.users.email` and persist.
  3. Create a Checkout Session with the configured price, success URL = `<site>/billing?status=success`, cancel URL = `<site>/billing?status=canceled`. Mode `subscription`.
  4. Return `{ url }`.
- [X] **T031** Deploy and test from the CLI: `curl -X POST <fn-url> -H "Authorization: Bearer <test-jwt>"` returns a valid Checkout URL.

## Phase 4 — Client entitlement layer

- [X] **T040** Add `VITE_STRIPE_PUBLISHABLE_KEY` and `VITE_STRIPE_PRICE_ID` to `frontend/.env.example`. Create `frontend/src/lib/billing/stripe.ts` exporting a `loadStripe` singleton.
- [X] **T041** Create `frontend/src/lib/billing/types.ts` — `Entitlement = { isPro: boolean, status: SubStatus, periodEnd?: Date, cancelAtPeriodEnd: boolean }`.
- [X] **T042** Create `frontend/src/lib/billing/entitlements.ts` exporting `subscriptionToEntitlement(row)` — pure function mapping the row → entitlement. Pro = `status in ('active','trialing')` AND (`!cancelAtPeriodEnd` OR `periodEnd > now`).
- [X] **T043** Create `frontend/src/lib/billing/useEntitlement.ts` — hook that:
  - Reads the user's `subscriptions` row on auth ready.
  - Subscribes to Supabase realtime on that row.
  - Polls every 5 minutes as a safety net (FR-006, SC-002).
  - Returns `{ entitlement, loading, refresh }`.
- [X] **T044** Create `frontend/src/lib/billing/checkout.ts` exporting `startCheckout()` — calls the create-checkout-session edge function with the user's JWT, redirects to the returned URL.
- [X] **T045** [P] `frontend/tests/unit/entitlements.test.ts` — coverage for every `status` × `cancelAtPeriodEnd` × `periodEnd` combination.

## Phase 5 — Upgrade flow (US1, P1) 🎯 MVP

- [X] **T050** Create `frontend/src/components/UpgradeCta.tsx` — single Upgrade button that handles the guest case (route to `/sign-in?return_to=/settings/billing`) and the signed-in case (call `startCheckout`).
- [X] **T051** Place `UpgradeCta` in exactly two locations (FR-002): `/settings/billing` (when not Pro) and the discovery surface `/whats-in-pro`. NO modals/banners on study screens.
- [X] **T052** Create `frontend/src/pages/BillingPage.tsx` at `/settings/billing` — shows the current plan, renewal date (or "Expires on…" if `cancelAtPeriodEnd`), `<UpgradeCta>` (for free users) or "Manage subscription" button (for Pro users).
- [X] **T053** Handle the post-checkout return URL: if `?status=success`, mount a "Pro activated" toast + force-refresh the entitlement. If `?status=canceled`, mount an informational toast and stay on the page.

**Checkpoint**: US1 partial — upgrade path works once Pro-only surfaces are wired in Phase 7.

## Phase 6 — Customer Portal + cancellation flow (US2, P1)

- [X] **T060** Create `supabase/functions/create-portal-session/index.ts`:
  1. Validate JWT, resolve `stripe_customer_id`.
  2. Create a Customer Portal session with `return_url = <site>/settings/billing`.
  3. Return `{ url }`.
- [X] **T061** Deploy and test.
- [X] **T062** In `BillingPage.tsx`, "Manage subscription" button calls the portal function and redirects.
- [X] **T063** Handle the `customer.subscription.updated` event with `cancel_at_period_end = true` end-to-end: confirm the BillingPage now shows "Expires on YYYY-MM-DD" and the entitlement remains `isPro=true` until `periodEnd`.
- [X] **T064** Handle `invoice.payment_failed`: status flips to `past_due`. The Pro UI disappears after a configurable grace period (set the grace to 0 days in v1 — strict).
- [X] **T065** [P] `frontend/tests/unit/billing-states.test.ts` — fixture rows for each status → expected BillingPage copy + entitlement.

**Checkpoint**: US2 complete — billing screen accurate, cancellation flow honored.

## Phase 7 — Pro-only surfaces

- [ ] **T070** Create `frontend/src/components/ProBadge.tsx` — small "Pro" tag with hover/long-press explanation copy. Free users only; Pro users see neither tags nor locks (FR-012).
- [ ] **T071** Create `frontend/src/components/ProThemeSwatch.tsx` — extra theme swatches in `/settings` gated by `entitlement.isPro`. Add at least two additional themes to `lib/theme/tokens.ts` ("Solar" + "Forest", or your call) per FR-007. Free users see them as locked previews with `<ProBadge>`.
- [ ] **T072** Create `frontend/src/components/AdvancedStatsPanel.tsx` — new panel on `/progress` showing Pro-only insights (e.g., per-domain weekly delta, per-difficulty accuracy, average study minutes per session). Locked + previewed for free users with a `<ProBadge>`.
- [ ] **T073** Create `frontend/src/components/ExamCountdownWidget.tsx` — configurable from `/settings`: pick a date, render days remaining. Hidden if no date set (spec assumption). Pro-only.
- [ ] **T074** Mount all three in their respective screens, conditionally on `useEntitlement().isPro`.

## Phase 8 — Discovery surface (US3, P2)

- [ ] **T080** Create `frontend/src/pages/WhatsInProPage.tsx` at `/whats-in-pro` — lists every Pro feature explicitly + the verbatim "Pro is about making the app yours — nothing about studying is paywalled." line (FR-011).
- [ ] **T081** Add a "What's in Pro?" link from `BillingPage` and from the `<ProBadge>` hover/long-press popover. No other entry points (FR-002).

## Phase 9 — Stripe-unsupported region fallback (edge case)

- [ ] **T090** Add a tiny config in `lib/billing/regions.ts` listing supported countries (start from Stripe's supported list). On `BillingPage`, if the user's locale country isn't in the list, render "Coming soon to your region" and hide `UpgradeCta`.

## Phase 10 — Account-deletion integration

- [ ] **T100** Update feature 003's `delete_self_account()` RPC: before deleting `auth.users`, schedule a Stripe subscription cancellation by calling a new edge function `cancel-subscription` (or inline via service role + a small JS helper). Cascade FKs already remove the `subscriptions` row.
- [ ] **T101** Smoke test: create a Pro test user; trigger account deletion; verify the Stripe subscription is canceled.

## Phase 11 — Tests + verification

- [X] **T110** Run `pnpm -C frontend test` and `pnpm -C frontend lint`. Resolve.
- [ ] **T111** Stripe test-mode E2E: free user → click Upgrade → checkout completes → return to app → Pro UI visible within 10 s.
- [ ] **T112** Cancel via Customer Portal → return → BillingPage shows expiry → use the Stripe dashboard to advance the test clock past `current_period_end` → entitlement flips off within 5 minutes.
- [X] **T113** [P] Repo-wide bundle grep: confirm zero matches for the Stripe secret key prefix `sk_test_` or `sk_live_` in `frontend/dist/` (SC-005).
- [X] **T114** Route audit: every reference to `UpgradeCta` lives in exactly two routes (`/settings/billing`, `/whats-in-pro`) — SC-006.

## Phase 12 — Cleanup

- [X] **T120** Update `specs/011-pro-tier/checklists/requirements.md`.
- [X] **T121** Document the Supabase secrets required (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) in `supabase/functions/stripe-webhook/README.md`.
- [X] **T122** Note in the project README that Pro is purely cosmetic — "no study content is paywalled" — to make the rule durable across future contributors.

## Dependencies summary

- Phase 1 + 2 + 3 (DB + webhook + checkout-session) are foundational and block everything else.
- US1 (Phase 5) needs Phase 4 (entitlement layer).
- US2 (Phase 6) layers on top of US1.
- Phase 7 Pro surfaces and Phase 8 discovery can land in parallel once entitlements work.
- Phase 10 cross-cuts feature 003; coordinate the PR.
