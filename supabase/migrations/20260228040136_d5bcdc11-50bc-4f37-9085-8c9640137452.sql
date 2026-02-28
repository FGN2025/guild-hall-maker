CREATE UNIQUE INDEX idx_profiles_display_name_lower
ON public.profiles (LOWER(display_name))
WHERE display_name IS NOT NULL;