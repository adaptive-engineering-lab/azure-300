-- T013: RLS on questions. Public read for anon + authenticated; no write
-- policies, so only the service role (used by the seed tool) can mutate
-- (FR-012, Principle IV).

alter table public.questions enable row level security;

create policy questions_public_read on public.questions
  for select
  to anon, authenticated
  using (true);
