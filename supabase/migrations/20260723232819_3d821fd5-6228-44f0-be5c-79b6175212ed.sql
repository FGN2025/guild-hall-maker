ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS source_event_id uuid NULL REFERENCES public.tenant_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_tournament_id uuid NULL REFERENCES public.tournaments(id) ON DELETE SET NULL;

ALTER TABLE public.marketing_campaigns
  DROP CONSTRAINT IF EXISTS marketing_campaigns_single_source_link;
ALTER TABLE public.marketing_campaigns
  ADD CONSTRAINT marketing_campaigns_single_source_link
  CHECK (source_event_id IS NULL OR source_tournament_id IS NULL);

CREATE INDEX IF NOT EXISTS marketing_campaigns_source_event_id_idx
  ON public.marketing_campaigns(source_event_id) WHERE source_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS marketing_campaigns_source_tournament_id_idx
  ON public.marketing_campaigns(source_tournament_id) WHERE source_tournament_id IS NOT NULL;