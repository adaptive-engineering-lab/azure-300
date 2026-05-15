# Phase 1 Data Model: Supabase Schema & Seed

Concrete table definitions, constraints, indexes, and RLS policies that satisfy the spec's FR-001 through FR-015.

---

## Entity overview

| Entity | Table | Owner | Visibility |
|---|---|---|---|
| Question | `public.questions` | seed tool (service role) | Public read via `anon` and `authenticated` |
| Profile | `public.profiles` | trigger on `auth.users` | Owner read/write only |
| UserProgress | `public.user_progress` | authenticated learner | Owner read/write only |
| Session | `public.sessions` | authenticated learner | Owner read/write only |

---

## `public.questions`

```sql
CREATE TABLE public.questions (
  id           uuid        PRIMARY KEY,                       -- supplied by seed file
  type         text        NOT NULL,
  domain       text        NOT NULL,
  topic        text        NOT NULL,
  difficulty   smallint    NOT NULL,
  source       text        NOT NULL,
  reviewer_id  text        NULL,
  reviewed_at  timestamptz NULL,
  content      jsonb       NOT NULL,
  content_hash text        NOT NULL,                          -- sha256 hex of canonical(content)
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT questions_type_chk
    CHECK (type IN ('flashcard', 'mcq', 'product-id')),

  CONSTRAINT questions_domain_chk
    CHECK (domain IN (
      'mlops-infra',
      'ml-lifecycle',
      'genaiops-infra',
      'genai-quality',
      'genai-optimization'
    )),

  CONSTRAINT questions_source_chk
    CHECK (source IN ('bank', 'ai-generated')),

  CONSTRAINT questions_difficulty_chk
    CHECK (difficulty BETWEEN 1 AND 3),

  CONSTRAINT questions_ai_audit_chk
    CHECK (
      source <> 'ai-generated'
      OR (reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL)
    ),

  CONSTRAINT questions_content_shape_chk
    CHECK (
      (type = 'flashcard'  AND content ? 'front' AND content ? 'back')
      OR (type = 'mcq'        AND content ? 'question' AND content ? 'options'
                              AND content ? 'correct'  AND content ? 'explanation')
      OR (type = 'product-id' AND content ? 'service_name' AND content ? 'category'
                              AND content ? 'description')
    )
);

CREATE INDEX questions_domain_idx     ON public.questions (domain);
CREATE INDEX questions_type_idx       ON public.questions (type);
CREATE INDEX questions_domain_type_idx ON public.questions (domain, type);
CREATE INDEX questions_topic_idx      ON public.questions (topic);
```

**Mapping to functional requirements**:

- FR-001 (shared envelope + type-specific payload): columns + `content jsonb`.
- FR-002 (five-domain whitelist): `questions_domain_chk`.
- FR-003 (three types): `questions_type_chk`.
- FR-004 (audit invariant): `questions_ai_audit_chk`.
- FR-005 (payload structure): `questions_content_shape_chk` provides the database-level guard; full structural validation lives in the JSON Schemas under `contracts/`.
- FR-013 (filterable): indexes on `domain`, `type`, `topic`, and `(domain, type)`.
- FR-015 (creation timestamp): `created_at` default.

**RLS**:

```sql
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY questions_public_read ON public.questions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policy — only the service role (used by the seed tool)
-- bypasses RLS and can mutate.
```

---

## `public.profiles`

```sql
CREATE TABLE public.profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text        NOT NULL DEFAULT '',
  streak_days  integer     NOT NULL DEFAULT 0,
  last_active  date        NULL,
  level        smallint    NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT profiles_level_chk CHECK (level BETWEEN 1 AND 4)
);
```

**Auto-provision trigger**:

```sql
CREATE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (new.id);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Mapping**: FR-014 (auto-creation + defaults).

**RLS**:

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_self_read ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

No INSERT policy — only the trigger creates rows. No DELETE policy — accounts are deleted via `auth.users` and cascade.

---

## `public.user_progress`

```sql
CREATE TABLE public.user_progress (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id   uuid        NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  times_seen    integer     NOT NULL DEFAULT 0,
  times_correct integer     NOT NULL DEFAULT 0,
  last_rating   text        NULL,
  next_review   date        NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_progress_rating_chk
    CHECK (last_rating IS NULL OR last_rating IN ('correct', 'almost', 'missed')),

  CONSTRAINT user_progress_counts_chk
    CHECK (times_correct <= times_seen),

  CONSTRAINT user_progress_unique UNIQUE (user_id, question_id)
);

CREATE INDEX user_progress_user_next_review_idx
  ON public.user_progress (user_id, next_review)
  WHERE next_review IS NOT NULL;
```

**Mapping**: FR-009, FR-011.

**RLS** (four policies, one per command):

```sql
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_progress_self_select ON public.user_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY user_progress_self_insert ON public.user_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_progress_self_update ON public.user_progress
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_progress_self_delete ON public.user_progress
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

---

## `public.sessions`

```sql
CREATE TABLE public.sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode             text        NOT NULL,
  topic            text        NULL,
  score_pct        real        NULL,
  duration_seconds integer     NULL,
  completed_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT sessions_mode_chk
    CHECK (mode IN ('flashcards', 'mcq', 'product-id', 'daily-review')),

  CONSTRAINT sessions_score_chk
    CHECK (score_pct IS NULL OR (score_pct >= 0 AND score_pct <= 100))
);

CREATE INDEX sessions_user_completed_idx
  ON public.sessions (user_id, completed_at DESC);
```

**Mapping**: FR-010, FR-011.

**RLS**: same four-policy pattern as `user_progress` (SELECT/INSERT/UPDATE/DELETE scoped on `auth.uid() = user_id`).

---

## Relationships

```
auth.users ──1──1── public.profiles ──1──N── public.user_progress ──N──1── public.questions
                            │
                            └──1──N── public.sessions
```

- Deleting an `auth.users` row cascades to `profiles` (FK ON DELETE CASCADE), which cascades to `user_progress` and `sessions`. A user account deletion wipes the user's data while leaving the bank intact.
- `user_progress.question_id` cascades on question deletion (rare; expected only when removing a withdrawn item from the bank).

---

## State transitions

`user_progress.last_rating` is the only field with meaningful state:

| Previous rating | New event | Next state |
|---|---|---|
| any | answer correctly | `last_rating = 'correct'`, `times_correct += 1`, `next_review` advanced per SM-2 (product spec §9) |
| any | answer "almost" | `last_rating = 'almost'`, `next_review` advanced |
| any | answer incorrectly | `last_rating = 'missed'`, `times_correct unchanged`, `next_review` = tomorrow |

`times_seen` increments on every event. The spaced-repetition policy itself is application-layer (a later feature); this schema only stores the inputs and the next-review date.

---

## Cross-cutting invariants verified by tests

| Invariant | Test |
|---|---|
| All 50 seed items match the JSON Schema for their type | `tests/contract/schema-validation.test.ts` |
| Every (domain, type) pair has at least one item | `tests/contract/domain-coverage.test.ts` |
| Re-running seed produces zero `updated_at` deltas | `tests/contract/seed-idempotency.test.ts` |
| `auth.users` insert produces exactly one `profiles` row | `tests/integration/profile-trigger.test.ts` |
| User A cannot read user B's `user_progress` or `sessions` | `tests/integration/rls-isolation.test.ts` |
| Public reads of `questions` work without auth | `tests/integration/question-queries.test.ts` |
