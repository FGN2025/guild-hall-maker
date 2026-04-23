
CREATE OR REPLACE VIEW public.monthly_redemption_spend
WITH (security_invoker = true) AS
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
