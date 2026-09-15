
-- ============ ENUMS ============
CREATE TYPE public.merit_level AS ENUM ('discover', 'develop', 'deploy');
CREATE TYPE public.merit_progress_status AS ENUM ('not_started', 'in_progress', 'awaiting_review', 'earned');
CREATE TYPE public.mapping_strength AS ENUM ('practice', 'supporting_evidence', 'potentially_satisfies');
CREATE TYPE public.verification_source AS ENUM ('steam_achievement', 'steam_playtime', 'uploaded_evidence', 'counselor_only');
CREATE TYPE public.requirement_submission_status AS ENUM ('draft', 'submitted', 'in_review', 'partial', 'credited', 'returned');
CREATE TYPE public.requirement_decision_type AS ENUM ('credited', 'partial', 'returned');
CREATE TYPE public.counselor_status AS ENUM ('pending', 'active', 'expired', 'revoked');

-- ============ SHARED TIMESTAMP TRIGGER (exists already as update_updated_at_column) ============

CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_tenant_member(_tenant_id, auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_tenant_admin(_tenant_id, auth.uid())
$$;

-- ============ 1. PATHWAYS ============
CREATE TABLE public.merit_pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  primary_game_id uuid REFERENCES public.games(id) ON DELETE SET NULL,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.merit_pathways TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merit_pathways TO authenticated;
GRANT ALL ON public.merit_pathways TO service_role;
ALTER TABLE public.merit_pathways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pathways_public_read" ON public.merit_pathways FOR SELECT USING (is_published OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "pathways_staff_write" ON public.merit_pathways FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE TRIGGER trg_merit_pathways_updated BEFORE UPDATE ON public.merit_pathways FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 2. MERITS ============
CREATE TABLE public.merits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_id uuid NOT NULL REFERENCES public.merit_pathways(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  level public.merit_level NOT NULL DEFAULT 'discover',
  icon text,
  skills text[] NOT NULL DEFAULT '{}',
  academy_next_step text,
  display_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.merits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merits TO authenticated;
GRANT ALL ON public.merits TO service_role;
ALTER TABLE public.merits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merits_public_read" ON public.merits FOR SELECT USING (is_published OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "merits_staff_write" ON public.merits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE TRIGGER trg_merits_updated BEFORE UPDATE ON public.merits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 3. MERIT <-> CHALLENGE ============
CREATE TABLE public.merit_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merit_id uuid NOT NULL REFERENCES public.merits(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT true,
  sequence_order integer NOT NULL DEFAULT 0,
  contribution_weight numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merit_id, challenge_id)
);
GRANT SELECT ON public.merit_challenges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merit_challenges TO authenticated;
GRANT ALL ON public.merit_challenges TO service_role;
ALTER TABLE public.merit_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merit_challenges_read" ON public.merit_challenges FOR SELECT USING (true);
CREATE POLICY "merit_challenges_staff_write" ON public.merit_challenges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE TRIGGER trg_merit_challenges_updated BEFORE UPDATE ON public.merit_challenges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 4. PLAYER MERIT PROGRESS ============
CREATE TABLE public.player_merit_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  merit_id uuid NOT NULL REFERENCES public.merits(id) ON DELETE CASCADE,
  status public.merit_progress_status NOT NULL DEFAULT 'not_started',
  verified_challenges integer NOT NULL DEFAULT 0,
  total_challenges integer NOT NULL DEFAULT 0,
  earned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, merit_id)
);
GRANT SELECT, INSERT, UPDATE ON public.player_merit_progress TO authenticated;
GRANT ALL ON public.player_merit_progress TO service_role;
ALTER TABLE public.player_merit_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merit_progress_own_read" ON public.player_merit_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "merit_progress_own_write" ON public.player_merit_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "merit_progress_own_update" ON public.player_merit_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_player_merit_progress_updated BEFORE UPDATE ON public.player_merit_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 5. TENANT ADVANCEMENT PROGRAMS ============
CREATE TABLE public.tenant_advancement_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  organization_kind text NOT NULL DEFAULT 'scouts',
  council_name text,
  is_active boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_advancement_programs TO authenticated;
GRANT ALL ON public.tenant_advancement_programs TO service_role;
ALTER TABLE public.tenant_advancement_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adv_programs_member_read" ON public.tenant_advancement_programs FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "adv_programs_admin_write" ON public.tenant_advancement_programs FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_adv_programs_updated BEFORE UPDATE ON public.tenant_advancement_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 6. OFFICIAL BADGES + VERSIONED REQUIREMENTS ============
CREATE TABLE public.official_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  organization_kind text NOT NULL DEFAULT 'scouts',
  source_url text,
  is_eagle_required boolean NOT NULL DEFAULT false,
  has_special_conditions boolean NOT NULL DEFAULT false,
  special_conditions_note text,
  is_retired boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.official_badges TO authenticated;
GRANT ALL ON public.official_badges TO service_role;
ALTER TABLE public.official_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "official_badges_read" ON public.official_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "official_badges_admin_write" ON public.official_badges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_official_badges_updated BEFORE UPDATE ON public.official_badges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.badge_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id uuid NOT NULL REFERENCES public.official_badges(id) ON DELETE CASCADE,
  requirement_number text NOT NULL,
  requirement_text text NOT NULL,
  version_year integer NOT NULL,
  source_url text,
  parent_requirement_id uuid REFERENCES public.badge_requirements(id) ON DELETE CASCADE,
  action_verbs text[] NOT NULL DEFAULT '{}',
  requires_in_person boolean NOT NULL DEFAULT false,
  safety_note text,
  is_retired boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (badge_id, requirement_number, version_year)
);
GRANT SELECT ON public.badge_requirements TO authenticated;
GRANT ALL ON public.badge_requirements TO service_role;
ALTER TABLE public.badge_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badge_requirements_read" ON public.badge_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "badge_requirements_admin_insert" ON public.badge_requirements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
-- versioned + immutable: no update/delete policies

-- ============ 7. TASK -> REQUIREMENT MAPPINGS ============
CREATE TABLE public.task_requirement_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_task_id uuid NOT NULL REFERENCES public.challenge_tasks(id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL REFERENCES public.badge_requirements(id) ON DELETE CASCADE,
  strength public.mapping_strength NOT NULL,
  verification_source public.verification_source NOT NULL DEFAULT 'uploaded_evidence',
  rationale text,
  source_reference text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_task_id, requirement_id)
);
GRANT SELECT ON public.task_requirement_mappings TO authenticated;
GRANT ALL ON public.task_requirement_mappings TO service_role;
ALTER TABLE public.task_requirement_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_req_mappings_read" ON public.task_requirement_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_req_mappings_admin_write" ON public.task_requirement_mappings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_task_req_mappings_updated BEFORE UPDATE ON public.task_requirement_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 8. COUNSELORS ============
CREATE TABLE public.counselor_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status public.counselor_status NOT NULL DEFAULT 'pending',
  registered_on date,
  annual_approval_expires_on date,
  youth_protection_expires_on date,
  qualifications text,
  council_name text,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.counselor_registrations TO authenticated;
GRANT ALL ON public.counselor_registrations TO service_role;
ALTER TABLE public.counselor_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "counselor_reg_staff_read" ON public.counselor_registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_tenant_admin(tenant_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "counselor_reg_staff_write" ON public.counselor_registrations FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_counselor_reg_updated BEFORE UPDATE ON public.counselor_registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.counselor_badge_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.counselor_registrations(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.official_badges(id) ON DELETE CASCADE,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  expires_on date,
  certifications text,
  approved_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registration_id, badge_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.counselor_badge_assignments TO authenticated;
GRANT ALL ON public.counselor_badge_assignments TO service_role;
ALTER TABLE public.counselor_badge_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "counselor_badges_read" ON public.counselor_badge_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.counselor_registrations r WHERE r.id = registration_id
    AND (r.user_id = auth.uid() OR public.is_tenant_admin(r.tenant_id) OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "counselor_badges_write" ON public.counselor_badge_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.counselor_registrations r WHERE r.id = registration_id AND (public.is_tenant_admin(r.tenant_id) OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.counselor_registrations r WHERE r.id = registration_id AND (public.is_tenant_admin(r.tenant_id) OR public.has_role(auth.uid(),'admin'))));
CREATE TRIGGER trg_counselor_badges_updated BEFORE UPDATE ON public.counselor_badge_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- authority check function
CREATE OR REPLACE FUNCTION public.is_approved_counselor(_user_id uuid, _tenant_id uuid, _badge_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.counselor_registrations r
    JOIN public.counselor_badge_assignments a ON a.registration_id = r.id
    WHERE r.user_id = _user_id
      AND r.tenant_id = _tenant_id
      AND a.badge_id = _badge_id
      AND r.status = 'active'
      AND a.is_active
      AND (r.annual_approval_expires_on IS NULL OR r.annual_approval_expires_on >= CURRENT_DATE)
      AND (r.youth_protection_expires_on IS NULL OR r.youth_protection_expires_on >= CURRENT_DATE)
      AND a.effective_from <= CURRENT_DATE
      AND (a.expires_on IS NULL OR a.expires_on >= CURRENT_DATE)
  )
$$;

-- ============ 9. UNIT LEADER AUTHORIZATION ============
CREATE TABLE public.unit_leader_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  scout_user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.official_badges(id) ON DELETE CASCADE,
  leader_user_id uuid NOT NULL,
  discussed_on date NOT NULL DEFAULT CURRENT_DATE,
  referred_registration_id uuid REFERENCES public.counselor_registrations(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.unit_leader_authorizations TO authenticated;
GRANT ALL ON public.unit_leader_authorizations TO service_role;
ALTER TABLE public.unit_leader_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unit_auth_read" ON public.unit_leader_authorizations FOR SELECT TO authenticated
  USING (scout_user_id = auth.uid() OR public.is_tenant_admin(tenant_id) OR public.has_role(auth.uid(),'admin')
    OR public.is_approved_counselor(auth.uid(), tenant_id, badge_id));
CREATE POLICY "unit_auth_staff_write" ON public.unit_leader_authorizations FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_unit_auth_updated BEFORE UPDATE ON public.unit_leader_authorizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 10. REQUIREMENT SUBMISSIONS ============
CREATE TABLE public.requirement_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  scout_user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.official_badges(id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL REFERENCES public.badge_requirements(id) ON DELETE RESTRICT,
  challenge_evidence_id uuid REFERENCES public.challenge_evidence(id) ON DELETE SET NULL,
  status public.requirement_submission_status NOT NULL DEFAULT 'draft',
  scout_note text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.requirement_submissions TO authenticated;
GRANT ALL ON public.requirement_submissions TO service_role;
ALTER TABLE public.requirement_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "req_sub_scout_read" ON public.requirement_submissions FOR SELECT TO authenticated
  USING (scout_user_id = auth.uid() OR public.is_tenant_admin(tenant_id) OR public.has_role(auth.uid(),'admin')
    OR public.is_approved_counselor(auth.uid(), tenant_id, badge_id));
CREATE POLICY "req_sub_scout_insert" ON public.requirement_submissions FOR INSERT TO authenticated
  WITH CHECK (scout_user_id = auth.uid() AND public.is_tenant_member(tenant_id));
CREATE POLICY "req_sub_update" ON public.requirement_submissions FOR UPDATE TO authenticated
  USING ((scout_user_id = auth.uid() AND status IN ('draft','returned'))
    OR public.is_approved_counselor(auth.uid(), tenant_id, badge_id))
  WITH CHECK ((scout_user_id = auth.uid() AND status IN ('draft','submitted'))
    OR public.is_approved_counselor(auth.uid(), tenant_id, badge_id));
CREATE TRIGGER trg_req_sub_updated BEFORE UPDATE ON public.requirement_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 11. IMMUTABLE DECISIONS ============
CREATE TABLE public.requirement_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.requirement_submissions(id) ON DELETE RESTRICT,
  counselor_user_id uuid NOT NULL,
  registration_id uuid REFERENCES public.counselor_registrations(id) ON DELETE SET NULL,
  decision public.requirement_decision_type NOT NULL,
  attested_personally_completed boolean NOT NULL DEFAULT false,
  notes text,
  requirement_version_year integer NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.requirement_decisions TO authenticated;
GRANT ALL ON public.requirement_decisions TO service_role;
ALTER TABLE public.requirement_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "req_dec_read" ON public.requirement_decisions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requirement_submissions s WHERE s.id = submission_id
    AND (s.scout_user_id = auth.uid() OR public.is_tenant_admin(s.tenant_id) OR public.has_role(auth.uid(),'admin')
      OR public.is_approved_counselor(auth.uid(), s.tenant_id, s.badge_id))));
CREATE POLICY "req_dec_counselor_insert" ON public.requirement_decisions FOR INSERT TO authenticated
  WITH CHECK (counselor_user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.requirement_submissions s WHERE s.id = submission_id
      AND public.is_approved_counselor(auth.uid(), s.tenant_id, s.badge_id)));
-- immutable: no update/delete policies

CREATE OR REPLACE FUNCTION public.block_decision_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'requirement_decisions is append-only';
END;
$$;
CREATE TRIGGER trg_block_decision_update BEFORE UPDATE OR DELETE ON public.requirement_decisions
  FOR EACH ROW EXECUTE FUNCTION public.block_decision_mutation();

-- ============ 12. COUNSELING SESSIONS (youth protection) ============
CREATE TABLE public.counseling_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.official_badges(id) ON DELETE CASCADE,
  scout_user_id uuid NOT NULL,
  counselor_user_id uuid NOT NULL,
  session_at timestamptz NOT NULL,
  modality text NOT NULL DEFAULT 'virtual',
  additional_adult_name text NOT NULL,
  additional_adult_role text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.counseling_sessions TO authenticated;
GRANT ALL ON public.counseling_sessions TO service_role;
ALTER TABLE public.counseling_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_read" ON public.counseling_sessions FOR SELECT TO authenticated
  USING (scout_user_id = auth.uid() OR counselor_user_id = auth.uid() OR public.is_tenant_admin(tenant_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "sessions_counselor_write" ON public.counseling_sessions FOR ALL TO authenticated
  USING (public.is_approved_counselor(auth.uid(), tenant_id, badge_id) OR public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_approved_counselor(auth.uid(), tenant_id, badge_id) OR public.is_tenant_admin(tenant_id));
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.counseling_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 13. ADVANCEMENT RECORDS ============
CREATE TABLE public.advancement_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  scout_user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.official_badges(id) ON DELETE CASCADE,
  digital_completed_at timestamptz,
  badge_eligible_at timestamptz,
  recorded_externally_at timestamptz,
  recorded_externally_by uuid,
  physical_issued_at timestamptz,
  physical_issued_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, scout_user_id, badge_id)
);
GRANT SELECT, INSERT, UPDATE ON public.advancement_records TO authenticated;
GRANT ALL ON public.advancement_records TO service_role;
ALTER TABLE public.advancement_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adv_records_read" ON public.advancement_records FOR SELECT TO authenticated
  USING (scout_user_id = auth.uid() OR public.is_tenant_admin(tenant_id) OR public.has_role(auth.uid(),'admin')
    OR public.is_approved_counselor(auth.uid(), tenant_id, badge_id));
CREATE POLICY "adv_records_staff_write" ON public.advancement_records FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.is_approved_counselor(auth.uid(), tenant_id, badge_id))
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.is_approved_counselor(auth.uid(), tenant_id, badge_id));
CREATE TRIGGER trg_adv_records_updated BEFORE UPDATE ON public.advancement_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- indexes
CREATE INDEX idx_merits_pathway ON public.merits(pathway_id);
CREATE INDEX idx_merit_challenges_challenge ON public.merit_challenges(challenge_id);
CREATE INDEX idx_pmp_user ON public.player_merit_progress(user_id);
CREATE INDEX idx_badge_req_badge ON public.badge_requirements(badge_id, version_year);
CREATE INDEX idx_trm_requirement ON public.task_requirement_mappings(requirement_id);
CREATE INDEX idx_req_sub_tenant_scout ON public.requirement_submissions(tenant_id, scout_user_id);
CREATE INDEX idx_req_dec_submission ON public.requirement_decisions(submission_id);
CREATE INDEX idx_adv_records_tenant ON public.advancement_records(tenant_id, scout_user_id);
