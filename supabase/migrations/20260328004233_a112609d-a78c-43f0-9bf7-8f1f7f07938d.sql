ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS cdl_domain              text,
  ADD COLUMN IF NOT EXISTS cfr_reference           text,
  ADD COLUMN IF NOT EXISTS coach_context           text,
  ADD COLUMN IF NOT EXISTS suggested_coach_prompts jsonb,
  ADD COLUMN IF NOT EXISTS cover_image_prompt      text;

COMMENT ON COLUMN challenges.cdl_domain IS 'CDL skill domain this challenge targets. Agent-generated.';
COMMENT ON COLUMN challenges.cfr_reference IS 'FMCSA CFR citation for the targeted CDL domain. Agent-generated.';
COMMENT ON COLUMN challenges.coach_context IS 'Plain-text brief injected as AI Coach system context when player opens coach from this challenge page. Agent-generated.';
COMMENT ON COLUMN challenges.suggested_coach_prompts IS 'JSON array of challenge-specific coaching prompt suggestions. Agent-generated.';
COMMENT ON COLUMN challenges.cover_image_prompt IS 'Structured image generation prompt for Lovable/Gemini. Agent-generated.';