
-- achievement_definitions table
CREATE TABLE public.achievement_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'trophy',
  tier text NOT NULL DEFAULT 'bronze',
  category text NOT NULL DEFAULT 'milestone',
  auto_criteria jsonb,
  max_progress integer,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievement definitions"
  ON public.achievement_definitions FOR SELECT USING (true);

CREATE POLICY "Admins can manage achievement definitions"
  ON public.achievement_definitions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_achievement_definitions_updated_at
  BEFORE UPDATE ON public.achievement_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- player_achievements table
CREATE TABLE public.player_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  awarded_by uuid,
  progress integer,
  notes text,
  UNIQUE (user_id, achievement_id)
);

ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view player achievements"
  ON public.player_achievements FOR SELECT USING (true);

CREATE POLICY "Admins can manage player achievements"
  ON public.player_achievements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed the 12 existing hardcoded achievements
INSERT INTO public.achievement_definitions (name, description, icon, tier, category, auto_criteria, max_progress, display_order) VALUES
  ('First Blood', 'Win your first match', 'zap', 'bronze', 'milestone', '{"type":"wins","threshold":1}', 1, 1),
  ('Rising Star', 'Win 5 matches', 'star', 'silver', 'milestone', '{"type":"wins","threshold":5}', 5, 2),
  ('Veteran Fighter', 'Win 20 matches', 'medal', 'gold', 'milestone', '{"type":"wins","threshold":20}', 20, 3),
  ('On Fire', 'Win 3 matches in a row', 'flame', 'bronze', 'milestone', '{"type":"streak","threshold":3}', 3, 4),
  ('Unstoppable', 'Win 5 matches in a row', 'flame', 'silver', 'milestone', '{"type":"streak","threshold":5}', 5, 5),
  ('Legendary Streak', 'Win 10 matches in a row', 'flame', 'gold', 'milestone', '{"type":"streak","threshold":10}', 10, 6),
  ('Competitor', 'Play 10 matches', 'swords', 'bronze', 'milestone', '{"type":"matches","threshold":10}', 10, 7),
  ('Seasoned Warrior', 'Play 50 matches', 'swords', 'gold', 'milestone', '{"type":"matches","threshold":50}', 50, 8),
  ('Elite Player', 'Achieve a 75%+ win rate (min 5 matches)', 'target', 'gold', 'milestone', '{"type":"win_rate","threshold":75,"min_matches":5}', 75, 9),
  ('Tournament Champion', 'Win all matches in a tournament', 'crown', 'platinum', 'milestone', '{"type":"tournament_champion"}', null, 10),
  ('Circuit Player', 'Compete in 3 different tournaments', 'shield', 'silver', 'milestone', '{"type":"multi_tournament","threshold":3}', 3, 11),
  ('Iron Will', 'Play 10 matches without giving up', 'shield', 'bronze', 'milestone', '{"type":"iron_will","threshold":10}', 10, 12);
