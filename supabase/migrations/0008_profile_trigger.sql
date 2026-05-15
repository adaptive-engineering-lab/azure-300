-- T041: auto-provision a public.profiles row whenever a new
-- auth.users row is created. Guarantees referential integrity for
-- user_progress.user_id and sessions.user_id — no race where progress
-- is written before a profile exists (FR-014).

create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
