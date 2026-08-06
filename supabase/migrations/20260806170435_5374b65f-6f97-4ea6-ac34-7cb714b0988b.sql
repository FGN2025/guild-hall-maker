-- 1. Row-level link: which asset produced this post's graphic.
ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES public.tenant_marketing_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS scheduled_posts_asset_id_idx ON public.scheduled_posts(asset_id);

-- 2. Enforcement: a linked asset must be same-tenant AND must be the actual
--    source of the post's image. This is what stops a post silently carrying
--    another beat's graphic.
CREATE OR REPLACE FUNCTION public.enforce_scheduled_post_asset_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a RECORD;
BEGIN
  IF NEW.asset_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, tenant_id, url, file_path
    INTO a
    FROM public.tenant_marketing_assets
   WHERE id = NEW.asset_id;

  IF a.id IS NULL THEN
    RAISE EXCEPTION 'scheduled_posts.asset_id % does not exist', NEW.asset_id;
  END IF;

  IF NEW.tenant_id IS NOT NULL AND a.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'asset % belongs to tenant %, post is tenant %',
      a.id, a.tenant_id, NEW.tenant_id;
  END IF;

  -- Image must come from the linked asset. Matched on the stored URL today;
  -- the durable-path migration extends this to the canonical storage path.
  IF NEW.image_url IS NOT NULL
     AND a.url IS NOT NULL
     AND NEW.image_url <> a.url
     AND (a.file_path IS NULL OR position(a.file_path in NEW.image_url) = 0) THEN
    RAISE EXCEPTION 'scheduled_posts.image_url does not match linked asset % (file_path %)',
      a.id, a.file_path;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_scheduled_post_asset_link ON public.scheduled_posts;
CREATE TRIGGER trg_enforce_scheduled_post_asset_link
  BEFORE INSERT OR UPDATE OF asset_id, image_url, tenant_id ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_scheduled_post_asset_link();

-- 3. Backfill: only where the post image resolves to exactly one asset.
WITH one_match AS (
  SELECT p.id AS post_id, min(a.id::text)::uuid AS asset_id, count(*) AS n
    FROM public.scheduled_posts p
    JOIN public.tenant_marketing_assets a
      ON a.url = p.image_url
   WHERE p.asset_id IS NULL
     AND p.image_url IS NOT NULL
   GROUP BY p.id
  HAVING count(*) = 1
)
UPDATE public.scheduled_posts p
   SET asset_id = m.asset_id
  FROM one_match m
 WHERE p.id = m.post_id;