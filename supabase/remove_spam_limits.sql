-- Odu Maga: spam limits removed on request (applied to the live project on 2026-11-27 as "remove_spam_limits").
-- Drops the 400-events-per-visit trigger and the 5-an-hour-per-phone / 300-an-hour-in-all check in submit_score.
-- The run check and one post per run stay.
drop trigger if exists run_events_throttle on public.run_events;
drop function if exists public.run_events_throttle();
do $$
declare
  def text := pg_get_functiondef('public.submit_score(text,integer,text)'::regprocedure);
  old text := $q$  if (select count(*) from scores x where x.player = coalesce(s.player, s.session)
        and x.created_at > now() - interval '1 hour') >= 5
     or (select count(*) from scores x where x.created_at > now() - interval '1 hour') >= 300 then
    raise exception 'too many scores, try later' using errcode = 'P0001', hint = 'rate_limited';
  end if;
$q$;
begin
  if position(old in def) = 0 then
    raise exception 'submit_score has changed; update this migration';
  end if;
  execute replace(def, old, '');
end;
$$;
