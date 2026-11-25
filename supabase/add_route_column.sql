-- Odu Maga: one leaderboard per route (Cubbon Park 5K, Ulsoor Lake 3K, NICE Road 10K).
-- Applied to the odu-maga project on 2026-11-25 as migration "add_route_per_leaderboard".
-- Existing scores are all Cubbon Park runs, so they default to 'cubbon'.
alter table public.scores add column if not exists route text not null default 'cubbon';
alter table public.scores drop constraint if exists scores_route_check;
alter table public.scores add constraint scores_route_check check (route in ('cubbon','ulsoor','nice'));
-- time limits scale with the route distance (same 2:00-36:00 /km band the 5K used)
alter table public.scores drop constraint if exists scores_time_s_check;
alter table public.scores add constraint scores_time_s_check check (
  (route = 'cubbon' and time_s between 600 and 10800) or
  (route = 'ulsoor' and time_s between 360 and 6480) or
  (route = 'nice'   and time_s between 1200 and 21600));
create index if not exists scores_route_time_idx on public.scores (route, time_s);

-- run stats: tag the route and allow the 10K's distances
alter table public.run_events add column if not exists route text;
alter table public.run_events drop constraint if exists run_events_route_check;
alter table public.run_events add constraint run_events_route_check check (route is null or route in ('cubbon','ulsoor','nice'));
alter table public.run_events drop constraint if exists run_events_dist_m_check;
alter table public.run_events add constraint run_events_dist_m_check check (dist_m >= 0 and dist_m <= 10100);
alter table public.run_events drop constraint if exists run_events_km_check;
alter table public.run_events add constraint run_events_km_check check (km >= 0 and km <= 10);
grant insert (route) on public.run_events to anon, authenticated;
grant select (route), insert (route) on public.scores to anon, authenticated;
