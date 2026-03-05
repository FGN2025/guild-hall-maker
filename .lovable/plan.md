

# Fix RLS Policy for Marketing Campaigns

## Problem
The `marketing_campaigns` table only has an RLS policy for `admin` role. Users with the `marketing` role can access the page (via `MarketingRoute`) but cannot insert/update/delete campaigns because the RLS policies block them.

The same issue applies to `marketing_assets`.

## Solution
Add RLS policies on both `marketing_campaigns` and `marketing_assets` tables to allow users with the `marketing` platform role to perform all operations.

### Database Migration
```sql
-- Allow marketing role users to manage campaigns
CREATE POLICY "Marketing role can manage campaigns"
  ON public.marketing_campaigns FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'marketing'))
  WITH CHECK (public.has_role(auth.uid(), 'marketing'));

-- Allow marketing role users to manage assets
CREATE POLICY "Marketing role can manage marketing assets"
  ON public.marketing_assets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'marketing'))
  WITH CHECK (public.has_role(auth.uid(), 'marketing'));
```

No code changes needed — only two new RLS policies.

