INSERT INTO public.app_settings (key, value)
VALUES
  ('publish_quota_daily', '{"default": 6, "overrides": {}}'),
  ('publish_quota_monthly', '{"default": 60, "overrides": {}}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;