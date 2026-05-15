-- Feature 011: per-user subscription state.
-- Source of truth is Stripe; this table is the cached entitlement
-- read by the frontend. Rows are written by a server-side webhook
-- handler (out of scope for v1) and by reconciliation jobs.

create type public.subscription_status as enum (
  'incomplete',
  'active',
  'past_due',
  'canceled',
  'expired',
  'trialing'
);

create type public.subscription_plan as enum ('free', 'pro');

create table public.subscriptions (
  user_id              uuid                         primary key references public.profiles(id) on delete cascade,
  plan                 public.subscription_plan     not null default 'free',
  status               public.subscription_status   not null default 'active',
  current_period_end   timestamptz                  null,
  stripe_customer_id   text                         null,
  stripe_subscription_id text                       null,
  updated_at           timestamptz                  not null default now()
);

create index subscriptions_status_idx on public.subscriptions (status);

-- RLS: each user reads only their own row; only the service role mutates.
alter table public.subscriptions enable row level security;

create policy subscriptions_self_read on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);

-- A row is auto-created when a profile is created, so the entitlement
-- read is always non-null (defaults to free / active).
create or replace function public.handle_new_user_subscription()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_user_subscription();
