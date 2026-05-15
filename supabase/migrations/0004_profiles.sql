-- T037: profiles — per-learner account record extending auth.users.
-- Rows are inserted exclusively by the on_auth_user_created trigger
-- (see 0008); application code MUST NOT INSERT directly. Deletion
-- happens via cascade when auth.users is deleted.

create table public.profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  display_name text        not null default '',
  streak_days  integer     not null default 0,
  last_active  date        null,
  level        smallint    not null default 1,
  created_at   timestamptz not null default now(),

  constraint profiles_level_chk check (level between 1 and 4)
);
