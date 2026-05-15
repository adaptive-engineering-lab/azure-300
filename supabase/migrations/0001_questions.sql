-- T012: questions table — shared envelope + type-specific jsonb payload, with
-- check constraints enforcing the spec's content-integrity invariants
-- (FR-001 through FR-005, FR-015).

create table public.questions (
  id           uuid        primary key,
  type         text        not null,
  domain       text        not null,
  topic        text        not null,
  difficulty   smallint    not null,
  source       text        not null,
  reviewer_id  text        null,
  reviewed_at  timestamptz null,
  content      jsonb       not null,
  content_hash text        not null,
  created_at   timestamptz not null default now(),

  constraint questions_type_chk
    check (type in ('flashcard', 'mcq', 'product-id')),

  constraint questions_domain_chk
    check (domain in (
      'mlops-infra',
      'ml-lifecycle',
      'genaiops-infra',
      'genai-quality',
      'genai-optimization'
    )),

  constraint questions_source_chk
    check (source in ('bank', 'ai-generated')),

  constraint questions_difficulty_chk
    check (difficulty between 1 and 3),

  constraint questions_ai_audit_chk
    check (
      source <> 'ai-generated'
      or (reviewer_id is not null and reviewed_at is not null)
    ),

  constraint questions_content_shape_chk
    check (
      (type = 'flashcard'  and content ? 'front'        and content ? 'back')
      or (type = 'mcq'        and content ? 'question'  and content ? 'options'
                              and content ? 'correct'   and content ? 'explanation')
      or (type = 'product-id' and content ? 'service_name' and content ? 'category'
                              and content ? 'description')
    )
);

create index questions_domain_idx       on public.questions (domain);
create index questions_type_idx         on public.questions (type);
create index questions_domain_type_idx  on public.questions (domain, type);
create index questions_topic_idx        on public.questions (topic);
