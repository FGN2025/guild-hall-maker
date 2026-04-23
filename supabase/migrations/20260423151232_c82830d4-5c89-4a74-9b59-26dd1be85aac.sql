
-- Add rarity and dollar_value to prizes
ALTER TABLE public.prizes
  ADD COLUMN IF NOT EXISTS rarity text DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS dollar_value numeric(10,2) DEFAULT 0;

-- Create a view for monthly redemption spend tracking
CREATE OR REPLACE VIEW public.monthly_redemption_spend AS
SELECT
  date_trunc('month', pr.created_at) AS month,
  COUNT(*) AS redemption_count,
  COALESCE(SUM(p.dollar_value), 0) AS total_dollar_spend,
  COALESCE(SUM(pr.points_spent), 0) AS total_points_spent
FROM public.prize_redemptions pr
JOIN public.prizes p ON p.id = pr.prize_id
WHERE pr.status IN ('approved', 'fulfilled')
GROUP BY date_trunc('month', pr.created_at)
ORDER BY month DESC;

-- Insert monthly budget cap setting
INSERT INTO public.app_settings (key, value, description)
VALUES ('monthly_prize_budget', '1500', 'Maximum dollar value of prizes that can be redeemed per month')
ON CONFLICT (key) DO NOTHING;
