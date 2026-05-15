-- T039: per-session record. One row per completed study session, used
-- to power the results screen and the progress dashboard.

create table public.sessions (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles(id) on delete cascade,
  mode             text        not null,
  topic            text        null,
  score_pct        real        null,
  duration_seconds integer     null,
  completed_at     timestamptz not null default now(),

  constraint sessions_mode_chk
    check (mode in ('flashcards', 'mcq', 'product-id', 'daily-review')),

  constraint sessions_score_chk
    check (score_pct is null or (score_pct >= 0 and score_pct <= 100))
);

create index sessions_user_completed_idx
  on public.sessions (user_id, completed_at desc);
