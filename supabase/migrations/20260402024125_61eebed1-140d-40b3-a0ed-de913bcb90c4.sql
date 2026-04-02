CREATE TABLE public.steam_player_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  steam_app_id text NOT NULL,
  achievement_api_name text NOT NULL,
  achieved boolean NOT NULL DEFAULT false,
  unlock_time timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, steam_app_id, achievement_api_name)
);

ALTER TABLE public.steam_player_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own steam achievements"
  ON public.steam_player_achievements FOR SELECT
  TO authenticated USING (auth.uid() = user_id);