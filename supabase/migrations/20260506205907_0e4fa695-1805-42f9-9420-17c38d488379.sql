-- 1. Unique index for player↔tenant link (used by upsert onConflict)
CREATE UNIQUE INDEX IF NOT EXISTS user_service_interests_user_tenant_unique
  ON public.user_service_interests (user_id, tenant_id);

-- 2. Backfill: matched legacy users → user_service_interests
INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status)
SELECT DISTINCT ON (lu.matched_user_id, lu.tenant_id)
       lu.matched_user_id,
       lu.tenant_id,
       COALESCE(NULLIF(trim(lu.zip_code), ''), ''),
       'legacy'
FROM public.legacy_users lu
WHERE lu.matched_user_id IS NOT NULL
  AND lu.tenant_id IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;