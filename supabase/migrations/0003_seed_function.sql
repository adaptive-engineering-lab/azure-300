-- T032: maintainer-only seed RPC. Runs the full batch in a single
-- transaction (function bodies are atomic); any constraint violation
-- aborts the whole call, preserving the previous valid DB state.
--
-- Returns counts of inserted/updated/unchanged rows. Idempotency is
-- preserved by the content_hash short-circuit: rows whose hash matches
-- the existing row are not touched, so updated_at does not drift.
--
-- Access: revoked from anon and authenticated. Only the service role
-- (used by the seed tool) may call this.

create or replace function public.seed_upsert_questions(items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int := 0;
  v_updated  int := 0;
  v_unchanged int := 0;
begin
  with input as (
    select
      (item->>'id')::uuid                              as id,
      item->>'type'                                    as type,
      item->>'domain'                                  as domain,
      item->>'topic'                                   as topic,
      (item->>'difficulty')::smallint                  as difficulty,
      item->>'source'                                  as source,
      nullif(item->>'reviewer_id','')                  as reviewer_id,
      nullif(item->>'reviewed_at','')::timestamptz     as reviewed_at,
      item->'content'                                  as content,
      item->>'content_hash'                            as content_hash
    from jsonb_array_elements(items) as item
  ),
  classified as (
    select
      input.*,
      case
        when existing.id is null                        then 'insert'
        when existing.content_hash = input.content_hash then 'unchanged'
        else                                                  'update'
      end as op
    from input
    left join public.questions as existing on existing.id = input.id
  ),
  ins as (
    insert into public.questions
      (id, type, domain, topic, difficulty, source, reviewer_id, reviewed_at, content, content_hash)
    select id, type, domain, topic, difficulty, source, reviewer_id, reviewed_at, content, content_hash
    from classified
    where op = 'insert'
    returning 1
  ),
  upd as (
    update public.questions q
       set type         = c.type,
           domain       = c.domain,
           topic        = c.topic,
           difficulty   = c.difficulty,
           source       = c.source,
           reviewer_id  = c.reviewer_id,
           reviewed_at  = c.reviewed_at,
           content      = c.content,
           content_hash = c.content_hash
      from classified c
     where q.id = c.id and c.op = 'update'
    returning 1
  )
  select
    (select count(*) from ins),
    (select count(*) from upd),
    (select count(*) from classified where op = 'unchanged')
  into v_inserted, v_updated, v_unchanged;

  return jsonb_build_object(
    'inserted',  v_inserted,
    'updated',   v_updated,
    'unchanged', v_unchanged
  );
end;
$$;

revoke all on function public.seed_upsert_questions(jsonb) from anon, authenticated, public;
