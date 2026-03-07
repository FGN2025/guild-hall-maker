ALTER TABLE public.media_library DROP CONSTRAINT media_library_file_type_check;
ALTER TABLE public.media_library ADD CONSTRAINT media_library_file_type_check
  CHECK (file_type = ANY (ARRAY['image','video','audio','embed']));