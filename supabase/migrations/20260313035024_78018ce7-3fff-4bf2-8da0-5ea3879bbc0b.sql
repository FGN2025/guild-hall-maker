ALTER TABLE public.challenges ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.quests ADD COLUMN is_featured boolean NOT NULL DEFAULT false;