-- Odu Maga: the two public tables as they stood on 2026-11-26, before security_scores.sql.
-- Written from the live database, because the first three changes (create_scores_leaderboard,
-- create_run_events_anonymous_stats, tighten_public_table_rights) were applied in Supabase and never saved here.
-- To rebuild an empty copy of the database, run the files in this order:
--   baseline.sql, control_centre.sql (sections 3 and 4 only: the run_events columns are already here),
--   security_scores.sql, security_lock_inserts.sql
-- add_route_column.sql is already folded into this file.

-- leaderboard: one row per posted time
create table if not exists public.scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 1 and 20),
  time_s integer not null,
  pace_s integer not null check (pace_s between 120 and 2160),
  created_at timestamptz not null default now(),
  route text not null default 'cubbon' check (route in ('cubbon', 'ulsoor', 'nice')),
  constraint scores_time_s_check check (
    (route = 'cubbon' and time_s between 600 and 10800) or
    (route = 'ulsoor' and time_s between 360 and 6480) or
    (route = 'nice'   and time_s between 1200 and 21600))
);
create index if not exists scores_time_idx on public.scores (time_s, id);
create index if not exists scores_created_idx on public.scores (created_at desc);
create index if not exists scores_route_time_idx on public.scores (route, time_s);

alter table public.scores enable row level security;
create policy "Anyone can read scores" on public.scores for select to anon, authenticated using (true);
create policy "Anyone can add a score" on public.scores for insert to anon, authenticated
  with check (char_length(btrim(name)) between 1 and 20);
revoke all on public.scores from anon, authenticated;
grant select on public.scores to anon, authenticated; -- whole table; narrowed to columns in security_scores.sql
grant insert (id, name, time_s, pace_s, created_at, route) on public.scores to anon, authenticated;

-- anonymous run stats: no names. One row per open / start / km / finish / quit / submit.
create table if not exists public.run_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session text not null check (char_length(session) between 8 and 40),
  run_no smallint not null check (run_no between 0 and 500),
  event text not null check (event in ('open', 'start', 'km', 'finish', 'quit', 'submit')),
  km smallint check (km between 0 and 10),
  dist_m integer check (dist_m between 0 and 10100),
  clock_s integer check (clock_s between 0 and 36000),
  water smallint check (water between 0 and 20),
  gels smallint check (gels between 0 and 20),
  autos smallint check (autos between 0 and 100),
  cows smallint check (cows between 0 and 100),
  dogs smallint check (dogs between 0 and 100),
  taps integer check (taps between 0 and 200000),
  min_energy smallint check (min_energy between 0 and 100),
  route text check (route is null or route in ('cubbon', 'ulsoor', 'nice'))
  -- player, ref, device, os, browser, lang, tz and hits are added by control_centre.sql
);
create index if not exists run_events_session_idx on public.run_events (session, run_no);

alter table public.run_events enable row level security;
create policy "Anyone can add a run event" on public.run_events for insert to anon, authenticated with check (true);
revoke all on public.run_events from anon, authenticated;
grant insert on public.run_events to anon, authenticated; -- nobody can read it through the API
