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

  select coalesce(jsonb_agg(to_jsonb(t) order by t.rank), '[]'::jsonb)
    into _top
    from (
      select rank, user_id, display_name, avatar_url, points, wins, losses, tournaments_played
      from public.get_season_standings(_season_id, 10)
    ) t;

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