-- Feature 003: SECURITY DEFINER RPC that lets an authenticated user
-- delete their own auth.users row. Without this, account deletion can
-- only happen via the admin API (which needs the service-role key —
-- not allowed in the frontend per constitution Principle IV).
--
-- The cascade FKs set up in 0004_profiles.sql + 0005_user_progress.sql
-- + 0006_sessions.sql + 0009_subscriptions.sql + 0010_admins.sql
-- handle removal of every dependent row when auth.users is deleted.
-- Spec 003 FR-013.

create or replace function public.delete_self_account()
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_self_account() from public, anon;
grant execute on function public.delete_self_account() to authenticated;
