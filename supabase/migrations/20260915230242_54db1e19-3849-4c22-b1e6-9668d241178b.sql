-- Harness: create a marked challenge, fire the trigger via an update, then clean up.
INSERT INTO public.challenges (
  name, game_id, difficulty, is_active, challenge_type,
  points_reward, points_first, points_second, points_third, points_participation,
  requires_evidence, skill_tags, created_by
)
SELECT
  'MERIT-HARNESS-DELETE-ME', 'ac7621e2-330d-4cdc-ae72-ce3fabb0333a', 'easy', false, 'standard',
  0, 0, 0, 0, 0,
  false, '{}', (SELECT created_by FROM public.challenges ORDER BY created_at LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.challenges WHERE name = 'MERIT-HARNESS-DELETE-ME');

UPDATE public.challenges
SET is_active = true, updated_at = now()
WHERE name = 'MERIT-HARNESS-DELETE-ME';

DELETE FROM public.challenges WHERE name = 'MERIT-HARNESS-DELETE-ME';