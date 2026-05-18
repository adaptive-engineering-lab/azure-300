# Supabase Edge Functions

Three functions power the Stripe-backed Pro tier (spec 011). All
run on Deno on Supabase's edge runtime.

## Functions

- `stripe-webhook/` — receives Stripe events, verifies the
  signature, dedupes via `public.webhook_events`, and updates
  `public.subscriptions`. Subscribes to `checkout.session.completed`,
  `customer.subscription.updated`, `customer.subscription.deleted`,
  and `invoice.payment_failed`.
- `create-checkout-session/` — caller is an authenticated user;
  resolves (or creates) their Stripe Customer, opens a Checkout
  Session for the configured Pro price, returns `{ url }`.
- `create-portal-session/` — caller is an authenticated Pro user;
  resolves their Stripe Customer, opens a Customer Portal session
  with a return URL, returns `{ url }`.

## Required secrets

Set on the Supabase project (`supabase secrets set NAME=value`):

| Secret                  | Used by                                       | Source                          |
|-------------------------|-----------------------------------------------|---------------------------------|
| `STRIPE_SECRET_KEY`     | all three                                     | Stripe Dashboard → Developers   |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook`                              | Stripe Dashboard → Webhooks     |
| `STRIPE_PRICE_ID`       | `create-checkout-session`                     | Stripe Dashboard → Products     |
| `APP_URL`               | `create-checkout-session`, portal             | e.g. `https://ai-300.app`       |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are populated
automatically by the platform.

## Deploy

```bash
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
```

`stripe-webhook` is deployed with `--no-verify-jwt` because Stripe
calls it without a Supabase JWT; the function verifies the Stripe
signature header instead.

## Stripe configuration

1. Create a Product and a recurring Price (~$3/mo) in Stripe.
2. Register the webhook endpoint
   `https://<project>.supabase.co/functions/v1/stripe-webhook` in
   the Stripe Dashboard, subscribed to the four events listed
   above. Copy the signing secret into Supabase secrets.

## Smoke testing

```bash
stripe trigger checkout.session.completed
```

Then `select * from public.subscriptions;` should show the test
event reflected within a few seconds. Repeating the trigger should
be a no-op thanks to `webhook_events` idempotency.
