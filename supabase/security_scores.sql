-- Odu Maga: harder-to-fake leaderboards, spam limits, a hide switch and a password lockout for the control centre.
-- Part 1 of 2. Safe to apply while the old game is live: the old way of posting keeps working until part 2
-- (security_lock_inserts.sql), which is applied once the new game code is on GitHub Pages.
--
-- How a score is checked now: the game no longer sends a time. It sends its visit code, the run number and a name to
-- submit_score(). The database looks up that run in the anonymous run stats and takes the time from the run's own
-- finish event, after checking the run really happened: a start and a finish on the same route, every km logged,
-- the full distance, a believable number of taps, and enough real time between start and finish for that game time.

-- 1. visitors can no longer choose a row's id or timestamp (a chosen timestamp could fake how long a run took,
--    a chosen id could take the next number and make the next real score fail)
revoke insert on public.run_events from anon, authenticated;
grant insert (session, run_no, event, km, dist_m, clock_s, water, gels, autos, cows, dogs, taps, min_energy, route,
  player, ref, device, os, browser, lang, tz, hits) on public.run_events to anon, authenticated;
revoke insert on public.scores from anon, authenticated;
grant insert (name, time_s, pace_s, route) on public.scores to anon, authenticated; -- removed in part 2

-- 2. tighter rules on every score, however it arrives. The fastest the game allows is about 2:20/km
--    (gel boost, downhill, flat out); best real times so far are 2:56-3:08/km.
alter table public.scores drop constraint if exists scores_time_s_check;
alter table public.scores add constraint scores_time_s_check check (
  (route = 'cubbon' and time_s between 700 and 10800) or
  (route = 'ulsoor' and time_s between 420 and 6480) or
  (route = 'nice'   and time_s between 1400 and 21600));
alter table public.scores drop constraint if exists scores_pace_matches_time;
alter table public.scores add constraint scores_pace_matches_time check (
  abs(pace_s - time_s::numeric / case route when 'cubbon' then 5 when 'ulsoor' then 3 else 10 end) <= 1);

-- 3. which run a score came from (never shown to visitors), and the hide switch
alter table public.scores
  add column if not exists session text,
  add column if not exists run_no smallint,
  add column if not exists player text,
  add column if not exists hidden boolean not null default false;
create unique index if not exists scores_one_per_run on public.scores (session, run_no) where session is not null;
create index if not exists scores_player_idx on public.scores (player, created_at);
drop policy if exists "Anyone can read scores" on public.scores;
create policy "Anyone can read scores" on public.scores for select to anon, authenticated using (not hidden);

-- 4. run stats: at most 400 events per visit (a 10K run sends about 13, so ~30 runs). The codes themselves are
--    already checked (run_events_session_check, run_events_run_no_check in baseline.sql).
create or replace function public.run_events_throttle() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from run_events where session = new.session) >= 400 then
    raise exception 'too many events for this visit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.run_events_throttle() from public, anon, authenticated;
drop trigger if exists run_events_throttle on public.run_events;
create trigger run_events_throttle before insert on public.run_events
  for each row execute function public.run_events_throttle();

-- 5. posting a score
create or replace function public.submit_score(p_session text, p_run_no int, p_name text)
returns table (id bigint, name text, time_s int, pace_s int, route text, rank int)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  nm text := btrim(coalesce(p_name, ''));
  s run_events;
  f run_events;
  rt text;
  km int;
  clk int;
  kms int;
  real_s numeric;
  new_id bigint;
begin
  if char_length(nm) not between 1 and 20 then
    raise exception 'bad name' using errcode = 'P0001';
  end if;
  select * into s from run_events e where e.session = p_session and e.run_no = p_run_no and e.event = 'start'
    order by e.id limit 1;
  select * into f from run_events e where e.session = p_session and e.run_no = p_run_no and e.event = 'finish'
    order by e.id limit 1;
  if s.id is null or f.id is null then
    raise exception 'run not found' using errcode = 'P0001', hint = 'run_not_found';
  end if;
  rt := coalesce(f.route, s.route);
  if rt is null or rt not in ('cubbon', 'ulsoor', 'nice') or (s.route is not null and s.route <> rt) then
    raise exception 'run does not check out' using errcode = 'P0001';
  end if;
  km := case rt when 'cubbon' then 5 when 'ulsoor' then 3 else 10 end;
  clk := case rt when 'nice' then 20 else 15 end; -- the game clock runs this many times real time
  select count(distinct e.km) into kms from run_events e
    where e.session = p_session and e.run_no = p_run_no and e.event = 'km';
  real_s := extract(epoch from f.created_at - s.created_at);
  if f.created_at < now() - interval '3 hours'
     or f.clock_s is null or coalesce(f.dist_m, 0) < km * 1000 - 20
     or kms < km - 1
     or coalesce(f.taps, 0) < 50 * km
     or real_s < f.clock_s::numeric / clk * 0.85 - 2 then
    raise exception 'run does not check out' using errcode = 'P0001';
  end if;
  -- spam limits: 5 scores an hour from one phone, 300 an hour in all
  if (select count(*) from scores x where x.player = coalesce(s.player, s.session)
        and x.created_at > now() - interval '1 hour') >= 5
     or (select count(*) from scores x where x.created_at > now() - interval '1 hour') >= 300 then
    raise exception 'too many scores, try later' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  begin
    insert into scores (name, time_s, pace_s, route, session, run_no, player)
      values (nm, f.clock_s, round(f.clock_s::numeric / km), rt, p_session, p_run_no, coalesce(s.player, s.session))
      returning scores.id into new_id;
  exception when unique_violation then
    raise exception 'already saved' using errcode = 'P0001', hint = 'already_saved';
  end;
  return query select x.id, x.name, x.time_s, x.pace_s, x.route,
    (select count(*)::int + 1 from scores y where y.route = rt and not y.hidden and y.time_s < x.time_s)
    from scores x where x.id = new_id;
end;
$$;
revoke all on function public.submit_score(text, int, text) from public;
grant execute on function public.submit_score(text, int, text) to anon, authenticated;

-- 6. control centre password: 10 wrong tries in 15 minutes locks it for the rest of those 15 minutes.
--    admin_gate answers null for the right password, else {"error": "wrong_password" | "locked"}. It answers rather
--    than raising an error, because an error would also undo the record of the wrong try.
create table if not exists public.admin_attempts (at timestamptz not null default now(), ok boolean not null);
alter table public.admin_attempts enable row level security;
revoke all on public.admin_attempts from anon, authenticated;
create index if not exists admin_attempts_at_idx on public.admin_attempts (at);

create or replace function public.admin_gate(p_pass text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  good boolean;
begin
  delete from admin_attempts where at < now() - interval '1 day';
  if (select count(*) from admin_attempts a where not a.ok and a.at > now() - interval '15 minutes') >= 10 then
    return jsonb_build_object('error', 'locked');
  end if;
  select hash = crypt(coalesce(p_pass, ''), hash) into good from admin_secrets where id = 1;
  insert into admin_attempts (ok) values (good is true);
  if good is not true then
    perform pg_sleep(1.5); -- slow down guessing
    return jsonb_build_object('error', 'wrong_password');
  end if;
  return null;
end;
$$;
revoke all on function public.admin_gate(text) from public, anon, authenticated;

-- the dashboard uses the same gate (its body is otherwise unchanged from control_centre.sql)
do $$
declare
  def text := pg_get_functiondef('public.admin_dashboard(text,text,integer)'::regprocedure);
  old text := $q$  select hash = crypt(coalesce(p_pass, ''), hash) into ok from admin_secrets where id = 1;
  if ok is not true then
    perform pg_sleep(1.5);
    raise exception 'wrong password' using errcode = '28P01';
  end if;$q$;
begin
  if position(old in def) = 0 then
    raise exception 'admin_dashboard has changed; update this migration';
  end if;
  execute replace(def, old, $r$  out := admin_gate(p_pass);
  if out is not null then
    return out;
  end if;$r$);
end;
$$;

-- 7. the hide switch: the control centre lists recent scores and can hide or show one
create or replace function public.admin_scores(p_pass text, p_route text default null, p_limit int default 50)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  g jsonb := admin_gate(p_pass);
begin
  if g is not null then
    return g;
  end if;
  return jsonb_build_object('scores', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name,
      'time_s', x.time_s, 'route', x.route, 'at', x.created_at, 'hidden', x.hidden, 'checked', x.session is not null)
      order by x.created_at desc)
    from (select * from scores s where p_route is null or s.route = p_route
      order by s.created_at desc limit least(greatest(coalesce(p_limit, 50), 1), 200)) x), '[]'));
end;
$$;
revoke all on function public.admin_scores(text, text, int) from public;
grant execute on function public.admin_scores(text, text, int) to anon, authenticated;

create or replace function public.admin_hide_score(p_pass text, p_id bigint, p_hidden boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  g jsonb := admin_gate(p_pass);
begin
  if g is not null then
    return g;
  end if;
  update scores set hidden = coalesce(p_hidden, true) where id = p_id;
  return jsonb_build_object('ok', found);
end;
$$;
revoke all on function public.admin_hide_score(text, bigint, boolean) from public;
grant execute on function public.admin_hide_score(text, bigint, boolean) to anon, authenticated;
