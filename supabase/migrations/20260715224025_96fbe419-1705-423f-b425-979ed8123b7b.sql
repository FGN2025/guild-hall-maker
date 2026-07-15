-- Remove unscoped tenant-admin INSERT policy on banned_users.
-- banned_users is a platform-wide blacklist with no tenant_id column, so tenant admins
-- must not be able to ban users across the whole platform. Only Platform Admins
-- (app_role = 'admin') can insert bans, via the existing "Admins manage bans" policy.
DROP POLICY IF EXISTS "Tenant admins can insert bans" ON public.banned_users;