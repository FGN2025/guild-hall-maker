
-- Create tournament status enum
CREATE TYPE public.tournament_status AS ENUM ('upcoming', 'open', 'in_progress', 'completed', 'cancelled');

-- Create match status enum
CREATE TYPE public.match_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- Tournaments table
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  game TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'single_elimination',
  max_participants INTEGER NOT NULL DEFAULT 16,
  entry_fee NUMERIC(10,2) DEFAULT 0,
  prize_pool TEXT,
  status public.tournament_status NOT NULL DEFAULT 'upcoming',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  rules TEXT,
  image_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tournament registrations table
CREATE TABLE public.tournament_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'registered',
  UNIQUE(tournament_id, user_id)
);

-- Match results table
CREATE TABLE public.match_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL DEFAULT 1,
  match_number INTEGER NOT NULL DEFAULT 1,
  player1_id UUID,
  player2_id UUID,
  player1_score INTEGER,
  player2_score INTEGER,
  winner_id UUID,
  status public.match_status NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

-- Tournaments: anyone can view, authenticated users can create
CREATE POLICY "Anyone can view tournaments"
  ON public.tournaments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tournaments"
  ON public.tournaments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their tournaments"
  ON public.tournaments FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their tournaments"
  ON public.tournaments FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Registrations: anyone can view, authenticated users manage their own
CREATE POLICY "Anyone can view registrations"
  ON public.tournament_registrations FOR SELECT USING (true);

CREATE POLICY "Users can register themselves"
  ON public.tournament_registrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their registration"
  ON public.tournament_registrations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Match results: anyone can view, tournament creator can manage
CREATE POLICY "Anyone can view match results"
  ON public.match_results FOR SELECT USING (true);

CREATE POLICY "Tournament creators can insert matches"
  ON public.match_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Tournament creators can update matches"
  ON public.match_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_id AND created_by = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_match_results_updated_at
  BEFORE UPDATE ON public.match_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
