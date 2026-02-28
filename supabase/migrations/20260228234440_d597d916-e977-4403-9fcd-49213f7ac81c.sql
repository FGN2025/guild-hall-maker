
ALTER TABLE public.tournaments
  ADD COLUMN prize_type text NOT NULL DEFAULT 'none',
  ADD COLUMN prize_id uuid REFERENCES public.prizes(id);
