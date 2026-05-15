-- Feature 013 (live-edit pivot): grant admins write access to public.questions
-- via RLS gated on membership in public.admins. The browser uses the user's
-- JWT only; no service-role key in the client (Principle IV).

create policy questions_admin_insert on public.questions
  for insert
  to authenticated
  with check (
    exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

create policy questions_admin_update on public.questions
  for update
  to authenticated
  using (
    exists (select 1 from public.admins a where a.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

create policy questions_admin_delete on public.questions
  for delete
  to authenticated
  using (
    exists (select 1 from public.admins a where a.user_id = auth.uid())
  );
