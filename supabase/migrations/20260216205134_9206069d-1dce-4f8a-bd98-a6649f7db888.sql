-- Item 3: Allow tenant admins to update lead status
CREATE POLICY "Tenant admins can update lead status"
  ON public.user_service_interests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_admins ta WHERE ta.tenant_id = user_service_interests.tenant_id AND ta.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_admins ta WHERE ta.tenant_id = user_service_interests.tenant_id AND ta.user_id = auth.uid()));

-- Item 5: Document ecosystem_auth_tokens RLS intent
COMMENT ON TABLE public.ecosystem_auth_tokens IS 'Short-lived SSO tokens managed exclusively by edge functions via service role. No client-side RLS policies by design.';