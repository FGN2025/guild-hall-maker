
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS supports_tournaments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_quests boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_challenges boolean NOT NULL DEFAULT false;

UPDATE public.games g SET supports_tournaments = true
  WHERE EXISTS (SELECT 1 FROM public.tournaments t WHERE t.game = g.name);

UPDATE public.games g SET supports_quests = true
  WHERE EXISTS (SELECT 1 FROM public.quests q WHERE q.game_id = g.id);

UPDATE public.games g SET supports_challenges = true
  WHERE EXISTS (SELECT 1 FROM public.challenges c WHERE c.game_id = g.id);
