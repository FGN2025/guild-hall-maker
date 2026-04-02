CREATE OR REPLACE FUNCTION public.compute_quest_rank(xp integer)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN xp >= 1000 THEN 'master'
    WHEN xp >= 600  THEN 'expert'
    WHEN xp >= 300  THEN 'journeyman'
    WHEN xp >= 100  THEN 'apprentice'
    ELSE 'novice'
  END;
$$;