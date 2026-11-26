-- Control centre (admin.html): extra anonymous stat columns, plus one locked function that returns the dashboard.
-- Run once in the Supabase SQL editor (already applied to the live project).
-- The password itself is NOT in this file. Set or change it with:
--   insert into admin_secrets (id, hash) values (1, extensions.crypt('your new password', extensions.gen_salt('bf')))
--   on conflict (id) do update set hash = excluded.hash;

-- 1. what the game now sends with each stat (nothing personal: a random player code kept on the phone, the link tag,
--    the kind of device and browser, language, time zone and how many times the runner stumbled)
alter table run_events
  add column if not exists player text check (player is null or char_length(player) between 8 and 40),
  add column if not exists ref text check (ref is null or ref ~ '^[a-z0-9_-]{1,24}$'),
  add column if not exists device text check (device is null or device in ('phone', 'tablet', 'desktop')),
  add column if not exists os text check (os is null or char_length(os) <= 16),
  add column if not exists browser text check (browser is null or char_length(browser) <= 16),
  add column if not exists lang text check (lang is null or char_length(lang) <= 16),
  add column if not exists tz text check (tz is null or char_length(tz) <= 40),
  add column if not exists hits smallint check (hits is null or hits between 0 and 500);

-- 2. runs from before routes existed were all Cubbon Park
update run_events set route = 'cubbon' where route is null and event <> 'open' and created_at < '2026-11-25';

-- 3. the password hash: nobody can read this table through the API
create table if not exists admin_secrets (id int primary key check (id = 1), hash text not null);
alter table admin_secrets enable row level security;
revoke all on admin_secrets from anon, authenticated;

create index if not exists run_events_created_idx on run_events (created_at);
create index if not exists run_events_run_idx on run_events (session, run_no);

-- 4. the dashboard. Returns only totals and the latest runs (no names, no raw rows), and only with the right password.
--    p_route: null for all routes, or 'cubbon' / 'ulsoor' / 'nice'. p_days: null for all time, or the last N days.
create or replace function admin_dashboard(p_pass text, p_route text default null, p_days int default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  ok boolean;
  since timestamptz := case when p_days is null then '-infinity'::timestamptz else now() - make_interval(days => p_days) end;
  out jsonb;
begin
  select hash = crypt(coalesce(p_pass, ''), hash) into ok from admin_secrets where id = 1;
  if ok is not true then
    perform pg_sleep(1.5); -- slow down guessing
    raise exception 'wrong password' using errcode = '28P01';
  end if;
  if p_route is not null and p_route not in ('cubbon', 'ulsoor', 'nice') then
    raise exception 'unknown route';
  end if;

  with ev as (
    select * from run_events where created_at >= since
  ),
  -- one row per run: a run is a (session, run_no) that has a start event
  runs as (
    select s.session, s.run_no, s.created_at as started_at, s.route,
      coalesce(s.player, s.session) as player, coalesce(s.ref, 'direct') as ref,
      coalesce(s.device, 'unknown') as device, coalesce(s.os, 'unknown') as os,
      coalesce(s.browser, 'unknown') as browser,
      f.clock_s as finish_s, f.hits as f_hits, f.water as f_water, f.gels as f_gels, f.min_energy as f_minE,
      q.created_at as quit_at, q.hits as q_hits,
      x.max_m, x.last_at, x.posted
    from ev s
    left join lateral (select * from run_events e where e.session = s.session and e.run_no = s.run_no
      and e.event = 'finish' order by e.id limit 1) f on true
    left join lateral (select * from run_events e where e.session = s.session and e.run_no = s.run_no
      and e.event = 'quit' order by e.id limit 1) q on true
    left join lateral (select max(e.dist_m) as max_m, max(e.created_at) as last_at,
      bool_or(e.event = 'submit') as posted
      from run_events e where e.session = s.session and e.run_no = s.run_no) x on true
    where s.event = 'start' and (p_route is null or s.route = p_route)
  ),
  r as (
    select *, case
      when finish_s is not null then 'finished'
      when quit_at is null and last_at > now() - interval '30 minutes' then 'running'
      else 'dnf' end as status
    from runs
  ),
  opens as (select distinct session from ev where event = 'open')
  select jsonb_build_object(
    'generated_at', now(),
    'kpi', (select jsonb_build_object(
      'visits', (select count(*) from opens),
      'players', count(distinct player),
      'runs', count(*),
      'finished', count(*) filter (where status = 'finished'),
      'dnf', count(*) filter (where status = 'dnf'),
      'running', count(*) filter (where status = 'running'),
      'playing_now', count(*) filter (where status = 'running' and last_at > now() - interval '5 minutes'),
      'posted', count(*) filter (where posted),
      'returning', (select count(*) from (select player from r group by player
        having count(distinct (started_at at time zone 'Asia/Kolkata')::date) > 1) t),
      'avg_finish_s', round(avg(finish_s)),
      'best_finish_s', min(finish_s)
    ) from r),
    'funnel', jsonb_build_object(
      'visits', (select count(*) from opens),
      'started', (select count(distinct session) from r),
      'finished', (select count(distinct session) from r where status = 'finished'),
      'posted', (select count(distinct session) from r where posted)
    ),
    'giveup', coalesce((select jsonb_agg(jsonb_build_object('km', km, 'n', n) order by km) from (
      select least(10, floor(coalesce(max_m, 0) / 1000.0))::int as km, count(*) as n
      from r where status = 'dnf' group by 1) t), '[]'),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('d', d, 'route', route, 'runs', n, 'finished', fin)
      order by d, route) from (
      select (started_at at time zone 'Asia/Kolkata')::date as d, coalesce(route, 'cubbon') as route,
        count(*) as n, count(*) filter (where status = 'finished') as fin
      from r group by 1, 2) t), '[]'),
    'hours', coalesce((select jsonb_agg(jsonb_build_object('h', h, 'n', n) order by h) from (
      select extract(hour from started_at at time zone 'Asia/Kolkata')::int as h, count(*) as n
      from r group by 1) t), '[]'),
    'routes', coalesce((select jsonb_agg(jsonb_build_object('route', route, 'runs', n, 'finished', fin,
      'players', pl, 'avg_s', av, 'best_s', best) order by route) from (
      select coalesce(route, 'cubbon') as route, count(*) as n, count(*) filter (where status = 'finished') as fin,
        count(distinct player) as pl, round(avg(finish_s)) as av, min(finish_s) as best
      from r group by 1) t), '[]'),
    'times', coalesce((select jsonb_agg(jsonb_build_object('route', coalesce(route, 'cubbon'), 's', finish_s))
      from (select route, finish_s from r where finish_s is not null order by started_at desc limit 3000) t), '[]'),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('k', ref, 'runs', n, 'players', pl) order by n desc)
      from (select ref, count(*) as n, count(distinct player) as pl from r group by 1) t), '[]'),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('k', device, 'n', n) order by n desc)
      from (select device, count(distinct player) as n from r group by 1) t), '[]'),
    'os', coalesce((select jsonb_agg(jsonb_build_object('k', os, 'n', n) order by n desc)
      from (select os, count(distinct player) as n from r group by 1) t), '[]'),
    'browsers', coalesce((select jsonb_agg(jsonb_build_object('k', browser, 'n', n) order by n desc)
      from (select browser, count(distinct player) as n from r group by 1) t), '[]'),
    'difficulty', (select jsonb_build_object(
      'avg_hits', round(avg(coalesce(f_hits, q_hits)), 1),
      'avg_water', round(avg(f_water), 1),
      'avg_gels', round(avg(f_gels), 1),
      'low_energy_pct', round(100.0 * count(*) filter (where f_minE < 25) / nullif(count(f_minE), 0))
    ) from r),
    'latest', coalesce((select jsonb_agg(jsonb_build_object('at', started_at, 'route', coalesce(route, 'cubbon'),
      'player', left(player, 6), 'device', device, 'ref', ref, 'status', status, 'finish_s', finish_s,
      'km', round(coalesce(max_m, 0) / 1000.0, 1)) order by started_at desc)
      from (select * from r order by started_at desc limit 15) t), '[]')
  ) into out;
  return out;
end;
$$;

revoke all on function admin_dashboard(text, text, int) from public;
grant execute on function admin_dashboard(text, text, int) to anon, authenticated;
