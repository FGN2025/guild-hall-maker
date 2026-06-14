# HF2 Roof Build Challenge — Draft Insert

Single idempotent migration. No schema changes. Inserts one draft challenge into `public.challenges` for House Flipper 2 (`game_id = 3913b35e-534e-4e8a-b5d6-bb8f3c7d84bd`) and 4 linked rows into `public.challenge_tasks`. Returns/logs the new `challenge_id`.

## SQL

```sql
DO $$
DECLARE
  _admin uuid;
  _challenge_id uuid;
  _game_id uuid := '3913b35e-534e-4e8a-b5d6-bb8f3c7d84bd';
  _name text := 'HF2 Skills: Roof Build and Working-at-Height Safety';
BEGIN
  SELECT user_id INTO _admin
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY user_id
  LIMIT 1;

  IF _admin IS NULL THEN
    RAISE EXCEPTION 'No admin user found in user_roles';
  END IF;

  -- Idempotency guard: skip if a row already exists for this game+name
  SELECT id INTO _challenge_id
  FROM public.challenges
  WHERE game_id = _game_id AND name = _name;

  IF _challenge_id IS NULL THEN
    INSERT INTO public.challenges (
      name, description, game_id, difficulty, points_reward,
      points_first, points_second, points_third, points_participation,
      challenge_type, requires_evidence, is_active, skill_tags,
      cover_image_prompt, created_by
    ) VALUES (
      _name,
      'House Flipper 2 lets you build a roof, the job that combines the most consequential structural work with the most dangerous working environment on a residential site. This challenge has you build and weatherproof a roof in HF2, then proves the real-world judgment the game cannot grade: the correct layering of structure and weather barriers, and the fall protection that is never optional at height. Falls from height are the leading cause of death in construction, so this challenge treats safety as the skill, not an afterthought.',
      _game_id,
      'intermediate',
      16,
      16, 0, 0, 0,
      'one_time',
      true,
      false,
      ARRAY['construction','roofing','fall-protection','HF2']::text[],
      'A worker in a fall-arrest harness clipped to an anchor on a partially shingled roof, underlayment and flashing visible in the unfinished section, a secured ladder at the eave, dramatic sky behind. Cinematic, cool sky with warm roof-deck light, strong sense of altitude. 4:5 portrait, no text.',
      _admin
    )
    RETURNING id INTO _challenge_id;

    INSERT INTO public.challenge_tasks
      (challenge_id, title, description, display_order, verification_type)
    VALUES
      (_challenge_id, 'Build the roof structure',
       'Use the HF2 roof-building system to construct the roof frame and decking over the structure. The frame carries the entire roof load down to the walls. Evidence: screenshot of the completed roof frame and sheathing before any weather layer is applied.',
       0, 'manual'),
      (_challenge_id, 'Apply weatherproofing in the correct order',
       'Lay the weather layers in sequence: underlayment over the sheathing, flashing at valleys and penetrations, then the shingle surface over the top, overlapping correctly. Most roof leaks start at the transitions, so the flashing matters as much as the shingles. Evidence: screenshot showing the layered weatherproofing, with flashing visible at a valley or penetration.',
       1, 'manual'),
      (_challenge_id, 'Complete the roof to a watertight finish',
       'Finish the roof so it sheds water across the whole surface, with no gaps at edges or penetrations. A roof is judged by whether it keeps water out for years, not by how it looks on day one. Evidence: screenshot of the finished, watertight roof from the exterior.',
       2, 'manual'),
      (_challenge_id, 'Knowledge check, working at height',
       'Complete the supplemental Roof Build loadout knowledge check (WO-3120) on fgn.academy, which tests selecting the structure, the weather layers in order, and the fall-protection gear that working at height demands. The critical decision is never skipping fall protection for speed. Evidence: a passing score of 70 percent or higher on the WO-3120 knowledge check.',
       3, 'manual');
  END IF;

  RAISE NOTICE 'HF2 Roof Build challenge_id: %', _challenge_id;
END $$;
```

## Acceptance checks (post-run, via psql)

```sql
SELECT id, name, is_active, game_id, points_reward, difficulty, skill_tags
FROM public.challenges
WHERE game_id = '3913b35e-534e-4e8a-b5d6-bb8f3c7d84bd'
  AND name = 'HF2 Skills: Roof Build and Working-at-Height Safety';

SELECT display_order, title, verification_type
FROM public.challenge_tasks
WHERE challenge_id = (
  SELECT id FROM public.challenges
  WHERE game_id = '3913b35e-534e-4e8a-b5d6-bb8f3c7d84bd'
    AND name = 'HF2 Skills: Roof Build and Working-at-Height Safety'
)
ORDER BY display_order;
```

Expected: 1 challenge row with `is_active=false`; 4 task rows ordered 0..3, all `manual`. The UUID is logged via `RAISE NOTICE` and surfaced after run for WO-3120 stamping. No other rows changed; challenge remains draft.
