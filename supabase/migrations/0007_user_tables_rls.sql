-- T040: RLS for profiles, user_progress, sessions. Per FR-011/FR-012:
-- authenticated learners read/write only their own rows; anon clients
-- see nothing on these tables.
--
-- profiles: SELECT + UPDATE only. INSERT is handled by the trigger in
-- migration 0008; DELETE cascades from auth.users.
-- user_progress and sessions: full CRUD on own rows.

-- ============================================================ profiles

alter table public.profiles enable row level security;

create policy profiles_self_select on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy profiles_self_update on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ====================================================== user_progress

alter table public.user_progress enable row level security;

create policy user_progress_self_select on public.user_progress
  for select to authenticated
  using (auth.uid() = user_id);

create policy user_progress_self_insert on public.user_progress
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy user_progress_self_update on public.user_progress
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy user_progress_self_delete on public.user_progress
  for delete to authenticated
  using (auth.uid() = user_id);

-- ============================================================ sessions

alter table public.sessions enable row level security;

create policy sessions_self_select on public.sessions
  for select to authenticated
  using (auth.uid() = user_id);

create policy sessions_self_insert on public.sessions
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy sessions_self_update on public.sessions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy sessions_self_delete on public.sessions
  for delete to authenticated
  using (auth.uid() = user_id);
