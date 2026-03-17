
# Configurable Discord Role Assignment — Completed

## What was built

### Database
- **`discord_role_mappings`** table with columns: `id`, `discord_role_id`, `discord_role_name`, `trigger_condition` (enum: on_link, on_achievement, on_rank, on_tournament_win, manual), `condition_value`, `platform_role` (nullable text: admin, moderator, tenant_admin, user — NULL = all users), `is_active`, `created_at`
- Admin-only RLS policies

### Edge Functions
- **`discord-server-roles`**: Fetches available roles from the FGN Discord server via bot API. Admin-authenticated.
- **`discord-oauth-callback`** (updated): Queries `discord_role_mappings` for all active `on_link` mappings, fetches the linking user's platform roles from `user_roles` and `tenant_admins`, and assigns only matching Discord roles. Falls back to `DISCORD_VERIFIED_ROLE_ID` if no mappings exist.

### Admin UI
- **`DiscordRoleManager`** component on the Ecosystem admin page
- Fetch server roles button, role + trigger + platform role selector, add/toggle/delete mappings
- Platform role options: All Users, Admin, Moderator, Tenant Admin, Regular User

---

# Delete & Ban Users — Completed

## What was built

### Database
- **`banned_users`** table: stores permanently banned emails (`email` UNIQUE, `banned_by`, `reason`, `created_at`)
- Admin-only RLS policy via `has_role()`

### Edge Functions
- **`delete-user`**: Admin-authenticated cascade delete of all user data across 20+ tables, nullifies match_results references, deletes auth user via admin API. Optionally inserts email into `banned_users` when `ban: true`.
- **`check-ban-status`**: Lightweight unauthenticated check — returns `{ banned: true/false }` for a given email.

### Admin UI
- Trash icon (delete) and Ban icon on each user row in Admin User Management
- Both protected by destructive ConfirmDialog with clear messaging
- Disabled for current user's own row
- Loading states during mutations

### Auth Flow
- Pre-signup ban check in Auth.tsx — blocked emails see "This account has been permanently banned" error before `signUp()` is called

---

# Phase 3: Subscriber Cloud Gaming Seat Purchases — Completed

## What was built

### Database
- **`subscriber_cloud_purchases`** table: tracks Stripe subscription per cloud gaming seat assignment (tenant_id, subscriber_id, user_id, stripe_subscription_id, status, timestamps)
- RLS policies: tenant members can view, tenant admins can insert/update
- `updated_at` trigger via `update_updated_at_column()`

### Hook
- **`useCloudGamingSeats`**: queries active seats from `subscriber_cloud_access` and purchases from `subscriber_cloud_purchases`, provides `assignSeat` (inserts access + purchase records, triggers Stripe checkout), `revokeSeat` (deactivates seat), and computed `availableSlots`/`availableSubscribers`

### UI
- **`CloudGamingSeatsCard`**: capacity bar, integration notice (Blacknut pending), subscriber picker for seat assignment, seats table with status badges and revoke action via ConfirmDialog
- Rendered in TenantSettings below CloudGamingConfigCard when cloud gaming is enabled

---

# Phase 5: Stripe Webhook Sync — Completed

## What was built

### Edge Function
- **`stripe-webhook`**: Receives Stripe webhook events, verifies signature via `STRIPE_WEBHOOK_SECRET`, and syncs status to local tables
- Handles 3 event types:
  - `checkout.session.completed`: Upserts `tenant_subscriptions` for tenant plan checkouts; updates `subscriber_cloud_purchases` status to `active` for cloud gaming seat checkouts
  - `customer.subscription.updated`: Syncs status changes (active → past_due, etc.) to both `tenant_subscriptions` and `subscriber_cloud_purchases`
  - `customer.subscription.deleted`: Marks subscriptions as `canceled`; auto-deactivates cloud gaming seats in `subscriber_cloud_access`
- Uses price ID matching to route events to correct table (tenant basic vs cloud gaming seat)
- `verify_jwt = false` in config.toml (Stripe calls this directly)

### Configuration
- `STRIPE_WEBHOOK_SECRET` secret stored for signature verification
- Stripe webhook endpoint: `https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

# Phase 6: Tenant Self-Service Signup — Completed

## What was built

### Public Landing Page
- **`/for-providers`** route with value proposition hero, feature grid, pricing card ($850/mo), and registration form
- Fields: Organization Name, Contact Email, Admin Name, Password
- Client-side validation via zod; redirects to Stripe Checkout on submit

### Edge Function
- **`provision-tenant`**: Public endpoint (verify_jwt = false) that:
  1. Validates inputs and checks banned emails
  2. Creates or finds existing auth user
  3. Generates unique slug from org name
  4. Inserts tenant with status `provisioning`
  5. Assigns user as tenant_admin (role: admin)
  6. Creates Stripe Checkout session for Tenant Basic price
  7. Returns checkout URL

### Webhook Enhancement
- **`stripe-webhook`** updated: on `checkout.session.completed` for Tenant Basic price, also updates `tenants.status` from `provisioning` → `active`

### Database
- Added unique constraint on `tenants.slug` (`tenants_slug_key`)

### Navigation
- "For Providers" link added to public navbar items and Index page footer

---

# Automated Engagement Emails — Completed

## What was built

### Database
- **`engagement_email_log`** table: tracks sent engagement emails for deduplication (`user_id`, `email_type`, `reference_id`, `sent_at`)
- RLS enabled with no policies (service-role only access)
- Indexes on `(user_id, email_type, sent_at)` and `(user_id, email_type, reference_id)`
- Added **`last_active_at`** column to `profiles` with trigger to auto-update on notification reads

### Edge Functions
- **`weekly-recap-email`**: Sends personalized weekly stats (matches, challenges, quests, achievements) to active users every Monday at 10:00 AM UTC. Skips users with zero activity.
- **`tournament-promo-email`**: Sends tournament promotion emails daily at 2:00 PM UTC to active users who haven't registered for open tournaments starting within 3 days.
- **`reengagement-email`**: Sends "we miss you" emails with new content highlights every Wednesday at 12:00 PM UTC to users inactive for 14–90 days.

### Scheduling
- Three pg_cron jobs configured to invoke the edge functions on their respective schedules

### Notification Preferences
- Added 3 new notification types: `weekly_recap`, `tournament_promo`, `reengagement`
- All toggleable per-user in Profile Settings under In-App and Email channels
- All engagement emails check `should_notify()` preference before sending

### Deduplication
- Weekly recap: max one per user per 7-day window
- Tournament promo: max one per user per tournament
- Re-engagement: max one per user per 14-day window

### Guide Updates
- Admin Guide notification section updated with engagement email documentation
