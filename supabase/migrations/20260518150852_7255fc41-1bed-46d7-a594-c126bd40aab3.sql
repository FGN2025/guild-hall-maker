
-- 1. Ensure pgmq queues exist
select pgmq.create('academy_sync');
select pgmq.create('academy_sync_dlq');

-- 2. Attempts counter for visibility
alter table public.challenge_completions
  add column if not exists academy_sync_attempts integer not null default 0;

-- 3. Enqueue helper (callable from triggers + edge fns)
create or replace function public.enqueue_academy_sync(_user_id uuid, _challenge_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  return pgmq.send('academy_sync', jsonb_build_object(
    'user_id', _user_id,
    'challenge_id', _challenge_id,
    'enqueued_at', now()
  ));
exception when undefined_table then
  perform pgmq.create('academy_sync');
  return pgmq.send('academy_sync', jsonb_build_object(
    'user_id', _user_id,
    'challenge_id', _challenge_id,
    'enqueued_at', now()
  ));
end;
$$;

-- 4. Trigger to auto-enqueue on completion insert/unsynced update
create or replace function public.trg_enqueue_academy_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.academy_synced, false) is not true then
    perform public.enqueue_academy_sync(new.user_id, new.challenge_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enqueue_academy_sync on public.challenge_completions;
create trigger trg_enqueue_academy_sync
after insert or update of academy_synced on public.challenge_completions
for each row execute function public.trg_enqueue_academy_sync();

-- 5. Admin-only queue stats
create or replace function public.get_academy_queue_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _pending bigint := 0;
  _dlq bigint := 0;
  _oldest_age_seconds numeric := null;
begin
  if not (public.has_role(auth.uid(), 'admin'::app_role)
       or public.has_role(auth.uid(), 'moderator'::app_role)) then
    raise exception 'not authorized';
  end if;

  begin
    select count(*) into _pending from pgmq.q_academy_sync;
    select extract(epoch from (now() - min(enqueued_at)))
      into _oldest_age_seconds from pgmq.q_academy_sync;
  exception when undefined_table then
    _pending := 0;
  end;

  begin
    select count(*) into _dlq from pgmq.q_academy_sync_dlq;
  exception when undefined_table then
    _dlq := 0;
  end;

  return jsonb_build_object(
    'pending', _pending,
    'dlq', _dlq,
    'oldest_age_seconds', _oldest_age_seconds
  );
end;
$$;

revoke all on function public.get_academy_queue_stats() from public;
grant execute on function public.get_academy_queue_stats() to authenticated;
