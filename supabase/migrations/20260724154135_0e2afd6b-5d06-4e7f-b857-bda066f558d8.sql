
UPDATE public.marketing_assets
SET is_universal = false,
    universal_published_at = NULL,
    universal_title = NULL,
    universal_campaign_context = NULL,
    usage_notes = NULL
WHERE id = 'bb56a349-f5ef-46cc-9391-cdc675ad1775';

DELETE FROM auth.users WHERE id = 'aaadeec9-4e65-47f9-a0d6-9fc00a272d8d';
