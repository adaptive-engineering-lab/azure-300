-- T038: per-learner, per-question progress. Used by spaced repetition
-- and weak-area dashboards. Owned by the authenticated learner only.

create table public.user_progress (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  question_id   uuid        not null references public.questions(id) on delete cascade,
  times_seen    integer     not null default 0,
  times_correct integer     not null default 0,
  last_rating   text        null,
  next_review   date        null,
  updated_at    timestamptz not null default now(),

  constraint user_progress_rating_chk
    check (last_rating is null or last_rating in ('correct', 'almost', 'missed')),

  constraint user_progress_counts_chk
    check (times_correct <= times_seen),

  constraint user_progress_unique unique (user_id, question_id)
);

create index user_progress_user_next_review_idx
  on public.user_progress (user_id, next_review)
  where next_review is not null;
