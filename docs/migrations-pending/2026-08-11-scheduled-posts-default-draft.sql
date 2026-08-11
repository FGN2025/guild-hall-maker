-- WRITTEN BUT NOT APPLIED. Run only AFTER the first live publish lands.
-- Makes the lazy path the safe path: an insert that omits status can no longer
-- land on a dispatchable value. The review ceiling already refuses the default
-- for agent actors; this closes it for every writer.
ALTER TABLE public.scheduled_posts ALTER COLUMN status SET DEFAULT 'draft';

-- Callers that intentionally queue a post for dispatch must now say so
-- explicitly (status = 'pending'); the human approval path in
-- src/hooks/useDraftDecision.ts already does.
