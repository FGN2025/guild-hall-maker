INSERT INTO public.app_settings (key, value, description)
VALUES ('homepage_ticker_embed', '<div class="commonninja_component pid-224b8aef-f0e7-4794-9adb-50c00868aadb"></div>', 'HTML embed code for the homepage ticker widget (displayed between Hero and Featured Video)')
ON CONFLICT (key) DO NOTHING;