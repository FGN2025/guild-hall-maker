UPDATE public.tenant_integrations
SET additional_config = COALESCE(additional_config, '{}'::jsonb) || jsonb_build_object(
  'passport_base_url', 'https://fgn.academy',
  'passport_link_mode', 'magic_link',
  'passport_magic_link_endpoint', 'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/passport-link'
)
WHERE provider_type = 'fgn_academy' AND is_active = true;