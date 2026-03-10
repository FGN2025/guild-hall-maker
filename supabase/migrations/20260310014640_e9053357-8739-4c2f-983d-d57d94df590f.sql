ALTER TABLE public.admin_notebook_connections
  ADD COLUMN game_id uuid REFERENCES public.games(id) ON DELETE SET NULL;