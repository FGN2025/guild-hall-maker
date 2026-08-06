ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS image_path text;

COMMENT ON COLUMN public.scheduled_posts.image_path IS
  'Canonical object path inside the tenant-marketing bucket. Signed URLs are derived from this at render/publish time; image_url is a cached convenience copy that may expire.';

-- Backfill 1: from the linked asset (authoritative).
UPDATE public.scheduled_posts p
   SET image_path = a.file_path
  FROM public.tenant_marketing_assets a
 WHERE p.asset_id = a.id
   AND p.image_path IS NULL
   AND a.file_path IS NOT NULL;

-- Backfill 2: parse the stored URL for unlinked posts.
UPDATE public.scheduled_posts p
   SET image_path = regexp_replace(
         split_part(substring(p.image_url from '/tenant-marketing/(.*)$'), '?', 1),
         '^/+', '')
 WHERE p.image_path IS NULL
   AND p.image_url LIKE '%/tenant-marketing/%';

-- Extend enforcement: when both a linked asset and a path are present they
-- must agree, so a post can never carry another beat's graphic.
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

  -- Canonical path wins when we have one on both sides.
  IF NEW.image_path IS NOT NULL AND a.file_path IS NOT NULL THEN
    IF NEW.image_path <> a.file_path THEN
      RAISE EXCEPTION 'scheduled_posts.image_path % does not match linked asset % (%)',
        NEW.image_path, a.id, a.file_path;
    END IF;
    RETURN NEW;
  END IF;

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
  BEFORE INSERT OR UPDATE OF asset_id, image_url, image_path, tenant_id ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_scheduled_post_asset_link();