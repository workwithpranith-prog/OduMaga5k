-- Odu Maga: one leaderboard per route (Cubbon Park 5K, Ulsoor Lake 3K, NICE Road 10K).
-- Run once in the Supabase SQL editor. Existing scores are all Cubbon Park runs, so they default to 'cubbon'.
-- Until this runs, the game keeps working: Cubbon saves as before, and Ulsoor / NICE show "leaderboard opens soon".
alter table public.scores add column if not exists route text not null default 'cubbon';
alter table public.scores drop constraint if exists scores_route_check;
alter table public.scores add constraint scores_route_check check (route in ('cubbon','ulsoor','nice'));
create index if not exists scores_route_time_idx on public.scores (route, time_s);
alter table public.run_events add column if not exists route text;
-- If scores has a check constraint on time_s or pace_s written for the 5K only, widen it so
-- 3K and 10K finishes fit (a 10K can take well over an hour).
