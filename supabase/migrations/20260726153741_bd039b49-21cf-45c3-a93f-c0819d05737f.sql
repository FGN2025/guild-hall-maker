ALTER TABLE public.tenant_marketing_assets
  ADD COLUMN IF NOT EXISTS overlay_config jsonb,
  ADD COLUMN IF NOT EXISTS background_url text;

COMMENT ON COLUMN public.tenant_marketing_assets.overlay_config IS
  'JSONB: { canvas: { format, width, height }, overlays: [TextOverlay|LogoOverlay|ShapeOverlay] }. Hydrated by AssetEditorDialog so composer output is re-editable.';
COMMENT ON COLUMN public.tenant_marketing_assets.background_url IS
  'Clean base image URL (no overlays baked in). Editor uses this as the background layer instead of the flattened url column.';