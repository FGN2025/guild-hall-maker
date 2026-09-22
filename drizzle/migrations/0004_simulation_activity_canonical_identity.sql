-- Phase 1: canonical Simulation Activity identity (additive only)

DO $$ BEGIN
  CREATE TYPE public.simulation_activity_status AS ENUM ('draft','active','retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.simulation_activity_provenance AS ENUM ('manual','derived_from_challenge','imported');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.simulation_mapping_status AS ENUM ('matched','needs_review','legacy','retired','orphaned_source');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.simulation_candidate_state AS ENUM ('pending','accepted','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.simulation_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  canonical_slug text NOT NULL,
  canonical_description text,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE RESTRICT,
  game_version text,
  platform_applicability text[] NOT NULL DEFAULT '{}',
  activity_category text,
  industry_domain text,
  status public.simulation_activity_status NOT NULL DEFAULT 'draft',
  provenance public.simulation_activity_provenance NOT NULL DEFAULT 'manual',
  source_challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  schema_version integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulation_activities TO authenticated;
GRANT ALL ON public.simulation_activities TO service_role;
ALTER TABLE public.simulation_activities ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS simulation_activities_slug_key ON public.simulation_activities (canonical_slug);
CREATE INDEX IF NOT EXISTS simulation_activities_game_idx ON public.simulation_activities (game_id);
CREATE INDEX IF NOT EXISTS simulation_activities_status_idx ON public.simulation_activities (status);
CREATE INDEX IF NOT EXISTS simulation_activities_domain_idx ON public.simulation_activities (industry_domain);
CREATE INDEX IF NOT EXISTS simulation_activities_updated_idx ON public.simulation_activities (updated_at);

CREATE TABLE IF NOT EXISTS public.simulation_activity_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_activity_id uuid NOT NULL REFERENCES public.simulation_activities(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  challenge_task_id uuid REFERENCES public.challenge_tasks(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT true,
  mapping_status public.simulation_mapping_status NOT NULL DEFAULT 'matched',
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulation_activity_challenges TO authenticated;
GRANT ALL ON public.simulation_activity_challenges TO service_role;
ALTER TABLE public.simulation_activity_challenges ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS sac_unique_triple
  ON public.simulation_activity_challenges (
    simulation_activity_id, challenge_id,
    COALESCE(challenge_task_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
CREATE UNIQUE INDEX IF NOT EXISTS sac_one_primary_per_challenge
  ON public.simulation_activity_challenges (challenge_id)
  WHERE challenge_task_id IS NULL AND is_primary;
CREATE INDEX IF NOT EXISTS sac_challenge_idx ON public.simulation_activity_challenges (challenge_id);
CREATE INDEX IF NOT EXISTS sac_activity_idx ON public.simulation_activity_challenges (simulation_activity_id);
CREATE INDEX IF NOT EXISTS sac_status_idx ON public.simulation_activity_challenges (mapping_status);

CREATE TABLE IF NOT EXISTS public.simulation_activity_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  suggested_activity_id uuid REFERENCES public.simulation_activities(id) ON DELETE CASCADE,
  similarity numeric,
  basis text,
  state public.simulation_candidate_state NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulation_activity_candidates TO authenticated;
GRANT ALL ON public.simulation_activity_candidates TO service_role;
ALTER TABLE public.simulation_activity_candidates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS sacand_challenge_idx ON public.simulation_activity_candidates (challenge_id);
CREATE INDEX IF NOT EXISTS sacand_state_idx ON public.simulation_activity_candidates (state);

-- New challenge columns (nullable, nothing backfilled)
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS simulation_activity_id uuid REFERENCES public.simulation_activities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_classification text;

DO $$ BEGIN
  ALTER TABLE public.challenges
    ADD CONSTRAINT challenges_content_classification_chk
    CHECK (content_classification IS NULL OR content_classification IN ('simulation','entertainment_only'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS challenges_simulation_activity_idx ON public.challenges (simulation_activity_id);

-- RLS policies
DROP POLICY IF EXISTS "Staff read simulation activities" ON public.simulation_activities;
CREATE POLICY "Staff read simulation activities" ON public.simulation_activities
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
DROP POLICY IF EXISTS "Admins manage simulation activities" ON public.simulation_activities;
CREATE POLICY "Admins manage simulation activities" ON public.simulation_activities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Staff read activity mappings" ON public.simulation_activity_challenges;
CREATE POLICY "Staff read activity mappings" ON public.simulation_activity_challenges
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
DROP POLICY IF EXISTS "Admins manage activity mappings" ON public.simulation_activity_challenges;
CREATE POLICY "Admins manage activity mappings" ON public.simulation_activity_challenges
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Staff read activity candidates" ON public.simulation_activity_candidates;
CREATE POLICY "Staff read activity candidates" ON public.simulation_activity_candidates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
DROP POLICY IF EXISTS "Admins manage activity candidates" ON public.simulation_activity_candidates;
CREATE POLICY "Admins manage activity candidates" ON public.simulation_activity_candidates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- updated_at maintenance
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sa_touch ON public.simulation_activities;
CREATE TRIGGER trg_sa_touch BEFORE UPDATE ON public.simulation_activities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_sac_touch ON public.simulation_activity_challenges;
CREATE TRIGGER trg_sac_touch BEFORE UPDATE ON public.simulation_activity_challenges
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_sacand_touch ON public.simulation_activity_candidates;
CREATE TRIGGER trg_sacand_touch BEFORE UPDATE ON public.simulation_activity_candidates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Single authoritative sync: link table -> challenges.simulation_activity_id
CREATE OR REPLACE FUNCTION public.sync_challenge_simulation_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target uuid;
  resolved uuid;
BEGIN
  PERFORM set_config('fgn.sync_simulation_activity','on',true);

  FOREACH target IN ARRAY (
    CASE
      WHEN TG_OP = 'INSERT' THEN ARRAY[NEW.challenge_id]
      WHEN TG_OP = 'DELETE' THEN ARRAY[OLD.challenge_id]
      ELSE ARRAY(SELECT DISTINCT x FROM unnest(ARRAY[NEW.challenge_id, OLD.challenge_id]) x)
    END
  ) LOOP
    SELECT simulation_activity_id INTO resolved
    FROM public.simulation_activity_challenges
    WHERE challenge_id = target AND challenge_task_id IS NULL AND is_primary
    LIMIT 1;

    UPDATE public.challenges
      SET simulation_activity_id = resolved
      WHERE id = target AND simulation_activity_id IS DISTINCT FROM resolved;
  END LOOP;

  PERFORM set_config('fgn.sync_simulation_activity','off',true);
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_sync_challenge_simulation_activity ON public.simulation_activity_challenges;
CREATE TRIGGER trg_sync_challenge_simulation_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.simulation_activity_challenges
  FOR EACH ROW EXECUTE FUNCTION public.sync_challenge_simulation_activity();

-- Guard: the pointer may only be written by the sync trigger
CREATE OR REPLACE FUNCTION public.guard_challenge_simulation_activity_pointer()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.simulation_activity_id IS DISTINCT FROM OLD.simulation_activity_id
     AND COALESCE(current_setting('fgn.sync_simulation_activity', true),'off') <> 'on' THEN
    RAISE EXCEPTION 'challenges.simulation_activity_id is derived; write simulation_activity_challenges instead';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_challenge_sa_pointer ON public.challenges;
CREATE TRIGGER trg_guard_challenge_sa_pointer
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.guard_challenge_simulation_activity_pointer();