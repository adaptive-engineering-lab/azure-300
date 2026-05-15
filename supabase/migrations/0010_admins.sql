-- Feature 013: maintainer-only admin editor.
-- Membership in this table grants /admin access in the frontend.
-- Population happens out-of-band (Supabase Studio or a one-off SQL
-- statement). There is no in-app surface to grant admin.

create table public.admins (
  user_id    uuid        primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Each user reads only their own row — they learn they're an admin by
-- this query returning a row.
create policy admins_self_read on public.admins
  for select to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policy — only the service role can mutate.
