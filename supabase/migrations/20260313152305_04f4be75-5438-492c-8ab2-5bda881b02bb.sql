ALTER TABLE public.tournaments ADD COLUMN achievement_id uuid REFERENCES public.achievement_definitions(id) ON DELETE SET NULL;
ALTER TABLE public.challenges ADD COLUMN achievement_id uuid REFERENCES public.achievement_definitions(id) ON DELETE SET NULL;
ALTER TABLE public.quests ADD COLUMN achievement_id uuid REFERENCES public.achievement_definitions(id) ON DELETE SET NULL;