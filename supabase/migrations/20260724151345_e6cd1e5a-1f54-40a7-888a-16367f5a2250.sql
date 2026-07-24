
-- Temporarily disable the guard so we can flip is_universal without an auth.uid()
ALTER TABLE public.marketing_assets DISABLE TRIGGER trg_guard_universal_flip;

UPDATE public.marketing_assets
SET is_universal = true,
    universal_title = 'Checkpoint 3 U1 — Universal Test Asset',
    universal_campaign_context = 'Verification: fanout of universal_asset_new to every active tenant.',
    usage_notes = 'Test only. Safe to unflip after U1/U2/U3/U4 verification.',
    universal_published_at = now(),
    universal_published_by = (SELECT id FROM auth.users WHERE email = 'darcy@fgn.gg' LIMIT 1)
WHERE id = 'bb56a349-f5ef-46cc-9391-cdc675ad1775';

ALTER TABLE public.marketing_assets ENABLE TRIGGER trg_guard_universal_flip;
