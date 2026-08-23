INSERT INTO public.app_settings (key, value, description)
VALUES ('scheduled_post_stale_window_hours', '6', 'How many hours past its scheduled time an approved social post may still publish. Older approved posts are failed with reason stale_window instead of being published late.')
ON CONFLICT (key) DO NOTHING;