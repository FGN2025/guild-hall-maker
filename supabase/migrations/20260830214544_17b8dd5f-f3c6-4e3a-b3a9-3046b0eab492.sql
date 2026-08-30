-- ROLLBACK of today's enforcement on scheduled_posts. Additive work (asset_id,
-- image_path, backfilled values, is_dispatch_approved) is retained.

-- 1. Drop the asset-link enforcement trigger and its function outright.
DROP TRIGGER IF EXISTS trg_enforce_scheduled_post_asset_link ON public.scheduled_posts;
DROP FUNCTION IF EXISTS public.enforce_scheduled_post_asset_link() CASCADE;

-- 2. Drop the CHECK constraint added today that ties 'approved' to a stamp.
ALTER TABLE public.scheduled_posts
  DROP CONSTRAINT IF EXISTS scheduled_posts_approved_requires_stamp;

-- 3. Restore the legacy 'pending' value to the status vocabulary so a
--    concurrent writer running older code cannot be rejected. The set stays
--    explicit and minimal; no catch-all.
ALTER TABLE public.scheduled_posts DROP CONSTRAINT IF EXISTS scheduled_posts_status_check;
ALTER TABLE public.scheduled_posts
  ADD CONSTRAINT scheduled_posts_status_check
  CHECK (status = ANY (ARRAY['draft','pending','pending_review','rejected','approved','published','failed','cancelled']));