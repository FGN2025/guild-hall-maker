-- Helper: challenge-derived tier for a set of users (internal, definer)
create or replace function public.leaderboard_challenge_tier(_user_ids uuid[])
returns table(user_id uuid, tier text, challenges_completed integer)
language sql
stable
security definer
set search_path = public
as $$
  select ce.user_id,
         case
           when bool_or(c.name like '%Champion%') then 'champion'
           when bool_or(c.name like '%Epic%') then 'epic'
           when bool_or(c.name like '%Platinum%') then 'platinum'
           when bool_or(c.name like '%Gold%') then 'gold'
           when bool_or(c.name like '%Silver%') then 'silver'
           when bool_or(c.name like '%Bronze%') then 'bronze'
           else 'unranked'
         end as tier,
         count(*)::int as challenges_completed
  from public.challenge_enrollments ce
  left join public.challenges c on c.id = ce.challenge_id
  where ce.status = 'completed' and ce.user_id = any(_user_ids)
  group by ce.user_id
$$;

revoke all on function public.leaderboard_challenge_tier(uuid[]) from public, anon, authenticated;

-- 1. All-time platform standings
create or replace function public.get_leaderboard_standings(_limit integer default 500)
returns table(
  rank integer,
  user_id uuid,
  display_name text,
  gamer_tag text,
  avatar_url text,
  points integer,
  wins integer,
  losses integer,
  tournaments_played integer,
  win_rate integer,
  challenges_completed integer,
  tier text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;

  return query
  with agg as (
    select ss.user_id as uid,
           sum(ss.points)::int as pts,
           sum(ss.wins)::int as w,
           sum(ss.losses)::int as l,
           sum(ss.tournaments_played)::int as tp
    from public.season_scores ss
    group by ss.user_id
  ),
  tiers as (
    select * from public.leaderboard_challenge_tier(array(select uid from agg))
  ),
  ranked as (
    select row_number() over (order by a.pts desc, a.w desc, a.uid) as rn, a.*
    from agg a
  )
  select r.rn::int,
         r.uid,
         coalesce(nullif(p.gamer_tag, ''), p.display_name, 'Unknown')::text,
         p.gamer_tag::text,
         p.avatar_url::text,
         r.pts, r.w, r.l, r.tp,
         (case when r.tp > 0 then round((r.w::numeric / r.tp) * 100)::int else 0 end),
         coalesce(t.challenges_completed, 0),
         coalesce(t.tier, 'unranked')::text
  from ranked r
  left join public.profiles_public p on p.user_id = r.uid
  left join tiers t on t.user_id = r.uid
  order by r.rn
  limit greatest(1, least(coalesce(_limit, 500), 2000));
end;
$$;

revoke all on function public.get_leaderboard_standings(integer) from public, anon;
grant execute on function public.get_leaderboard_standings(integer) to authenticated, service_role;

-- 2. Season standings (live scores or frozen snapshots)
create or replace function public.get_season_standings(_season_id uuid, _limit integer default 500)
returns table(
  rank integer,
  user_id uuid,
  display_name text,
  gamer_tag text,
  avatar_url text,
  points integer,
  wins integer,
  losses integer,
  tournaments_played integer,
  challenges_completed integer,
  tier text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _status text;
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;

  select s.status into _status from public.seasons s where s.id = _season_id;
  if _status is null then
    return;
  end if;

  return query
  with base as (
    select sn.user_id as uid, sn.final_points as pts, sn.wins as w, sn.losses as l,
           0 as tp, sn.final_rank as rnk
    from public.season_snapshots sn
    where _status = 'completed' and sn.season_id = _season_id
    union all
    select sc.user_id, sc.points, sc.wins, sc.losses, sc.tournaments_played,
           row_number() over (order by sc.points desc, sc.wins desc, sc.user_id)::int
    from public.season_scores sc
    where _status <> 'completed' and sc.season_id = _season_id
  ),
  tiers as (
    select * from public.leaderboard_challenge_tier(array(select uid from base))
  )
  select b.rnk::int,
         b.uid,
         coalesce(nullif(p.gamer_tag, ''), p.display_name, 'Unknown')::text,
         p.gamer_tag::text,
         p.avatar_url::text,
         b.pts, b.w, b.l, b.tp,
         coalesce(t.challenges_completed, 0),
         coalesce(t.tier, 'unranked')::text
  from base b
  left join public.profiles_public p on p.user_id = b.uid
  left join tiers t on t.user_id = b.uid
  order by b.rnk
  limit greatest(1, least(coalesce(_limit, 500), 2000));
end;
$$;

revoke all on function public.get_season_standings(uuid, integer) from public, anon;
grant execute on function public.get_season_standings(uuid, integer) to authenticated, service_role;

-- 3. Season summary statistics (no per-player rows beyond the visible top 10)
create or replace function public.get_season_stats_summary(_season_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _status text;
  _total_players int := 0;
  _total_points int := 0;
  _total_matches int := 0;
  _tiers jsonb := '[]'::jsonb;
  _top jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;

  select s.status into _status from public.seasons s where s.id = _season_id;
  if _status is null then
    return jsonb_build_object('totalPlayers',0,'totalMatches',0,'totalPoints',0,
                              'avgPointsPerMatch',0,'topPlayers','[]'::jsonb,'tierDistribution','[]'::jsonb);
  end if;

  if _status = 'completed' then
    select count(*), coalesce(sum(final_points),0), coalesce(sum(wins+losses),0)
      into _total_players, _total_points, _total_matches
      from public.season_snapshots where season_id = _season_id;

    select coalesce(jsonb_agg(jsonb_build_object('tier', tier, 'count', c) order by tier), '[]'::jsonb)
      into _tiers
      from (select tier, count(*)::int as c from public.season_snapshots
            where season_id = _season_id group by tier) q;
  else
    select count(*), coalesce(sum(points),0), coalesce(sum(wins+losses),0)
      into _total_players, _total_points, _total_matches
      from public.season_scores where season_id = _season_id;

    select coalesce(jsonb_agg(jsonb_build_object('tier', tier, 'count', c) order by tier), '[]'::jsonb)
      into _tiers
      from (
        select case
                 when pct <= 0.05 then 'platinum'
                 when pct <= 0.15 then 'gold'
                 when pct <= 0.35 then 'silver'
                 when pct <= 0.60 then 'bronze'
                 else 'none' end as tier,
               count(*)::int as c
        from (
          select (row_number() over (order by points desc, wins desc, user_id))::numeric
                 / nullif(count(*) over (), 0) as pct
          from public.season_scores where season_id = _season_id
        ) r
        group by 1
      ) q
      where tier <> 'none';
  end if;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by (x->>'rank')::int), '[]'::jsonb)
    into _top
    from (
      select to_jsonb(t) as x
      from (
        select rank, user_id, display_name, avatar_url, points, wins, losses, tournaments_played
        from public.get_season_standings(_season_id, 10)
      ) t
    ) y;

  return jsonb_build_object(
    'totalPlayers', _total_players,
    'totalMatches', _total_matches,
    'totalPoints', _total_points,
    'avgPointsPerMatch', case when _total_matches > 0
      then round((_total_points::numeric / _total_matches) * 10) / 10 else 0 end,
    'topPlayers', _top,
    'tierDistribution', _tiers
  );
end;
$$;

revoke all on function public.get_season_stats_summary(uuid) from public, anon;
grant execute on function public.get_season_stats_summary(uuid) to authenticated, service_role;

-- 4. Season-over-season progression (pure aggregate, no identities)
create or replace function public.get_season_progression()
returns table(season_name text, total_points integer, total_players integer, avg_points integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;

  return query
  select case when s.status = 'active' then s.name || ' (live)' else s.name end::text,
         d.pts::int,
         d.cnt::int,
         (case when d.cnt > 0 then round(d.pts::numeric / d.cnt)::int else 0 end)
  from public.seasons s
  cross join lateral (
    select case when s.status = 'completed'
             then (select coalesce(sum(final_points),0) from public.season_snapshots where season_id = s.id)
             else (select coalesce(sum(points),0) from public.season_scores where season_id = s.id) end as pts,
           case when s.status = 'completed'
             then (select count(*) from public.season_snapshots where season_id = s.id)
             else (select count(*) from public.season_scores where season_id = s.id) end as cnt
  ) d
  where s.status in ('completed', 'active')
  order by s.start_date asc;
end;
$$;

revoke all on function public.get_season_progression() from public, anon;
grant execute on function public.get_season_progression() to authenticated, service_role;