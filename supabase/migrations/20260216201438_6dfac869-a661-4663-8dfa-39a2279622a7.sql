
-- Add role column to tenant_admins
ALTER TABLE public.tenant_admins
  ADD COLUMN role text NOT NULL DEFAULT 'admin';

-- Allow tenant admins (role=admin) to manage team members in their own tenant
CREATE POLICY "Tenant admins can manage their team"
  ON public.tenant_admins FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_admins ta
      WHERE ta.tenant_id = tenant_admins.tenant_id
        AND ta.user_id = auth.uid()
        AND ta.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_admins ta
      WHERE ta.tenant_id = tenant_admins.tenant_id
        AND ta.user_id = auth.uid()
        AND ta.role = 'admin'
    )
  );
