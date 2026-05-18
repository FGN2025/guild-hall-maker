-- Debounced passport refresh queue (not pgmq — coalesces per user)
create table if not exists public.passport_refresh_pending (
  user_id uuid primary key,
  requested_at timestamptz not null default now(),
  last_sent_at timestamptz,
  last_sent_note text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_passport_refresh_pending_due
  on public.passport_refresh_pending (requested_at)
  where last_sent_at is null or last_sent_at < requested_at;

alter table public.passport_refresh_pending enable row level security;

create policy "passport_refresh_pending admin read"
  on public.passport_refresh_pending for select
  using (public.has_role(auth.uid(), 'admin'::app_role));

-- Helper called by sync workers after a successful Academy dispatch
create or replace function public.enqueue_passport_refresh(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if _user_id is null then return; end if;
  insert into public.passport_refresh_pending (user_id, requested_at)
  values (_user_id, now())
  on conflict (user_id) do update
    set requested_at = now(),
        updated_at = now();
end;
$$;

-- Extend queue stats with passport metrics
create or replace function public.get_academy_queue_stats()
returns jsonb
language plpgsql
stable security definer
set search_path = public
as $function$
declare
  _pending bigint := 0; _dlq bigint := 0; _oldest_age_seconds numeric := null;
  _ach_pending bigint := 0; _ach_dlq bigint := 0; _ach_oldest numeric := null;
  _quest_pending bigint := 0; _quest_dlq bigint := 0; _quest_oldest numeric := null;
  _task_pending bigint := 0; _task_dlq bigint := 0; _task_oldest numeric := null;
  _chain_pending bigint := 0; _chain_dlq bigint := 0; _chain_oldest numeric := null;
  _passport_pending bigint := 0; _passport_oldest numeric := null;
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

  select count(*),
         extract(epoch from (now() - min(requested_at)))
    into _passport_pending, _passport_oldest
    from public.passport_refresh_pending
   where last_sent_at is null or last_sent_at < requested_at;

  return jsonb_build_object(
    'pending', _pending, 'dlq', _dlq, 'oldest_age_seconds', _oldest_age_seconds,
    'achievement_pending', _ach_pending, 'achievement_dlq', _ach_dlq, 'achievement_oldest_age_seconds', _ach_oldest,
    'quest_pending', _quest_pending, 'quest_dlq', _quest_dlq, 'quest_oldest_age_seconds', _quest_oldest,
    'task_pending', _task_pending, 'task_dlq', _task_dlq, 'task_oldest_age_seconds', _task_oldest,
    'chain_pending', _chain_pending, 'chain_dlq', _chain_dlq, 'chain_oldest_age_seconds', _chain_oldest,
    'passport_pending', _passport_pending, 'passport_oldest_age_seconds', _passport_oldest
  );
end;
$function$;