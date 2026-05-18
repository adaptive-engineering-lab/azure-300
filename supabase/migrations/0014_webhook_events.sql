-- Feature 011: Stripe webhook idempotency log.
-- The stripe-webhook edge function inserts each event.id; if the
-- INSERT conflicts, the event is a retry and the handler exits
-- early without touching subscriptions. RLS has no policies, so
-- only the service role can read or write this table.

create table public.webhook_events (
  id          text         primary key,           -- Stripe event.id
  type        text         not null,
  payload     jsonb        not null,
  received_at timestamptz  not null default now()
);

alter table public.webhook_events enable row level security;
