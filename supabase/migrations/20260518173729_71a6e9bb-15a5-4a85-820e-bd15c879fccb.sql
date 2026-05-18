
-- P1 #5: Quest-chain bonus event streaming to Academy
alter table public.quest_chain_completions
  add column if not exists academy_synced boolean not null default false,
  add column if not exists academy_synced_at timestamptz,
  add column if not exists academy_sync_note text,
  add column if not exists academy_sync_attempts int not null default 0;

create or replace function public.enqueue_academy_chain_sync(_user_id uuid, _chain_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  return pgmq.send('academy_chain_sync', jsonb_build_object(
    'user_id', _user_id,
    'chain_id', _chain_id,
    'enqueued_at', now()
  ));
exception when undefined_table then
  perform pgmq.create('academy_chain_sync');
  return pgmq.send('academy_chain_sync', jsonb_build_object(
    'user_id', _user_id,
    'chain_id', _chain_id,
    'enqueued_at', now()
  ));
end;
$$;

create or replace function public.trg_enqueue_academy_chain_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.academy_synced, false) is not true then
    perform public.enqueue_academy_chain_sync(new.user_id, new.chain_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enqueue_academy_chain_sync on public.quest_chain_completions;
create trigger trg_enqueue_academy_chain_sync
after insert on public.quest_chain_completions
for each row execute function public.trg_enqueue_academy_chain_sync();

-- Extend get_academy_queue_stats with chain metrics
create or replace function public.get_academy_queue_stats()
returns jsonb
language plpgsql
stable security definer
set search_path = public
as $$
declare
  _pending bigint := 0; _dlq bigint := 0; _oldest_age_seconds numeric := null;
  _ach_pending bigint := 0; _ach_dlq bigint := 0; _ach_oldest numeric := null;
  _quest_pending bigint := 0; _quest_dlq bigint := 0; _quest_oldest numeric := null;
  _task_pending bigint := 0; _task_dlq bigint := 0; _task_oldest numeric := null;
  _chain_pending bigint := 0; _chain_dlq bigint := 0; _chain_oldest numeric := null;
begin
  if not (public.has_role(auth.uid(), 'admin'::app_role)
       or public.has_role(auth.uid(), 'moderator'::app_role)) then
    raise exception 'not authorized';
  end if;

  begin
    select count(*) into _pending from pgmq.q_academy_sync;
    select extract(epoch from (now() - min(enqueued_at))) into _oldest_age_seconds from pgmq.q_academy_sync;
  exception when undefined_table then _pending := 0; end;
  begin select count(*) into _dlq from pgmq.q_academy_sync_dlq; exception when undefined_table then _dlq := 0; end;

  begin
    select count(*) into _ach_pending from pgmq.q_academy_achievement_sync;
    select extract(epoch from (now() - min(enqueued_at))) into _ach_oldest from pgmq.q_academy_achievement_sync;
  exception when undefined_table then _ach_pending := 0; end;
  begin select count(*) into _ach_dlq from pgmq.q_academy_achievement_sync_dlq; exception when undefined_table then _ach_dlq := 0; end;

  begin
    select count(*) into _quest_pending from pgmq.q_academy_quest_sync;
    select extract(epoch from (now() - min(enqueued_at))) into _quest_oldest from pgmq.q_academy_quest_sync;
  exception when undefined_table then _quest_pending := 0; end;
  begin select count(*) into _quest_dlq from pgmq.q_academy_quest_sync_dlq; exception when undefined_table then _quest_dlq := 0; end;

  begin
    select count(*) into _task_pending from pgmq.q_academy_task_sync;
    select extract(epoch from (now() - min(enqueued_at))) into _task_oldest from pgmq.q_academy_task_sync;
  exception when undefined_table then _task_pending := 0; end;
  begin select count(*) into _task_dlq from pgmq.q_academy_task_sync_dlq; exception when undefined_table then _task_dlq := 0; end;

  begin
    select count(*) into _chain_pending from pgmq.q_academy_chain_sync;
    select extract(epoch from (now() - min(enqueued_at))) into _chain_oldest from pgmq.q_academy_chain_sync;
  exception when undefined_table then _chain_pending := 0; end;
  begin select count(*) into _chain_dlq from pgmq.q_academy_chain_sync_dlq; exception when undefined_table then _chain_dlq := 0; end;

  return jsonb_build_object(
    'pending', _pending, 'dlq', _dlq, 'oldest_age_seconds', _oldest_age_seconds,
    'achievement_pending', _ach_pending, 'achievement_dlq', _ach_dlq, 'achievement_oldest_age_seconds', _ach_oldest,
    'quest_pending', _quest_pending, 'quest_dlq', _quest_dlq, 'quest_oldest_age_seconds', _quest_oldest,
    'task_pending', _task_pending, 'task_dlq', _task_dlq, 'task_oldest_age_seconds', _task_oldest,
    'chain_pending', _chain_pending, 'chain_dlq', _chain_dlq, 'chain_oldest_age_seconds', _chain_oldest
  );
end;
$$;

-- Ensure queue exists up-front (idempotent)
do $$ begin
  perform pgmq.create('academy_chain_sync');
exception when others then null; end $$;
do $$ begin
  perform pgmq.create('academy_chain_sync_dlq');
exception when others then null; end $$;
