-- Odu Maga: part 2 of security_scores.sql. Apply only once the game that posts through submit_score() is live,
-- or the old game would stop saving times. After this, a score can only arrive through submit_score().
revoke insert on public.scores from anon, authenticated;
drop policy if exists "Anyone can add a score" on public.scores;
