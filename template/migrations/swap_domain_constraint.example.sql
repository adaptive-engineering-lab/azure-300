-- Template migration: swap the questions.domain CHECK constraint when
-- moving the codebase to a new exam.
--
-- USAGE: copy this file to supabase/migrations/00XX_swap_domain_chk.sql
-- (next available number), replace the slug list below, and apply via
-- `supabase db reset` (local) or `supabase db push --linked` (cloud).
--
-- WHEN TO RUN THIS:
--   - You are forking the repo for a new exam (AZ-900, AI-900, etc.).
--   - The new exam has different domain slugs than AI-300.
--   - You need to deploy against a Supabase project that has the AI-300
--     constraint already applied.
--
-- WHEN NOT TO RUN THIS:
--   - Brand-new Supabase project. Just edit 0001_questions.sql in place
--     before the first `db push`. Constraints are easier to define right
--     the first time than to swap later.

-- 1. Drop the existing constraint (idempotent).
alter table public.questions drop constraint if exists questions_domain_chk;

-- 2. Add the new constraint with the new exam's domain slugs.
--    Replace the slug list with what you put in exams.config.json.
alter table public.questions add constraint questions_domain_chk
  check (domain in (
    '<domain-slug-1>',
    '<domain-slug-2>',
    '<domain-slug-3>'
    -- '<domain-slug-N>'
  ));

-- 3. (Optional) If the OLD bank had rows with domains no longer in the
--    new slug list, the constraint add will fail. Either:
--    (a) Truncate the bank first (`truncate table public.questions;`)
--        and re-seed from the new exam's content files. Recommended for
--        a clean fork.
--    (b) Update existing rows to map old domains to new ones, then add
--        the constraint. Use this only if you have hand-curated rows
--        you want to preserve.
--
-- Example for option (b):
--   update public.questions set domain = '<new-slug>' where domain = '<old-slug>';
