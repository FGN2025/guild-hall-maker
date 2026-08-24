ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS parent_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_parent_tenant_id ON public.tenants(parent_tenant_id);

ALTER TABLE public.tenant_admins
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'direct';

CREATE OR REPLACE FUNCTION public.enforce_tenant_parent_depth()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  grandparent uuid;
  child_count integer;
BEGIN
  IF NEW.parent_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_tenant_id = NEW.id THEN
    RAISE EXCEPTION 'A tenant cannot be its own parent';
  END IF;

  SELECT parent_tenant_id INTO grandparent FROM public.tenants WHERE id = NEW.parent_tenant_id;
  IF grandparent IS NOT NULL THEN
    RAISE EXCEPTION 'Sub-accounts cannot have sub-accounts (max depth is one level)';
  END IF;

  SELECT count(*) INTO child_count FROM public.tenants WHERE parent_tenant_id = NEW.id;
  IF child_count > 0 THEN
    RAISE EXCEPTION 'This tenant already has sub-accounts and cannot become a sub-account itself';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_tenant_parent_depth ON public.tenants;
CREATE TRIGGER trg_enforce_tenant_parent_depth
BEFORE INSERT OR UPDATE OF parent_tenant_id ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_parent_depth();