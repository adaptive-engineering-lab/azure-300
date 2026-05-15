-- Defense in depth: prevent anon and authenticated from calling the auth
-- trigger functions via PostgREST's RPC surface. They still fire as
-- triggers on auth.users insertion (those run as the table owner), but
-- they should never be callable as /rest/v1/rpc/<name> — outside a
-- trigger context, NEW is null and the function errors anyway. Revoking
-- EXECUTE removes the unexpected RPC surface entirely.

revoke execute on function public.handle_new_user()              from anon, authenticated, public;
revoke execute on function public.handle_new_user_subscription() from anon, authenticated, public;
