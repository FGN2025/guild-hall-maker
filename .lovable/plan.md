

## Assessment: Ensuring All Legacy Users Can Log In

### Current State

| Metric | Count |
|--------|-------|
| Legacy user records | 4,739 |
| Already matched to registered accounts | 4 |
| Unmatched with email | 4,719 |
| Unmatched without email (cannot recover) | 16 |
| Unique unmatched emails | 4,429 |
| Duplicate emails (same email across providers) | 235 |
| Emails overlapping with existing auth accounts | 6 |
| Currently registered users | 21 |

### What Already Works

1. **Login + Forgot Password** — The Auth page has sign-in with email/password and a "Forgot Password?" link that calls `resetPasswordForEmail` with a redirect to `/reset-password`. The ResetPassword page handles the `PASSWORD_RECOVERY` event correctly.
2. **Legacy matching on signup** — When a new user signs up, `match-legacy-user` is invoked to auto-match by email and carry over their `legacy_username` as `gamer_tag`.
3. **Repeated signup detection** — If someone tries to sign up with an email that already has an account, the system detects it and switches to sign-in mode.

### The Problem

Legacy users (4,719 with emails) have never created accounts on the new platform. They **cannot** log in because no `auth.users` record exists for them. They would need to go through the full signup flow (ZIP check → subscriber verify → account creation → email confirmation → Discord linking).

### Recommended Plan

**Goal**: Let legacy users enter their email, land in the system with minimal friction, and have their legacy data automatically linked.

#### Option A — Magic Link Login for Legacy Users (Recommended)

Add a "Returning Player? Log in with email" flow that:

1. **New UI on Auth page**: Add a "Returning Player" tab/button alongside Login and Sign Up
2. **Edge function `login-legacy-user`**: Accepts an email, checks if it exists in `legacy_users` (unmatched), and if so:
   - Creates an `auth.users` account via `admin.createUser()` with a random password and `email_confirm: true` (pre-confirmed)
   - Creates their profile with `gamer_tag` from `legacy_username`
   - Links them to their tenant via `user_service_interests`
   - Marks the legacy record as matched
   - Sends a magic link via `admin.generateLink()` so they can set their own password
3. **On first login**: The user lands on a "Set Your Password" prompt so future logins use email/password
4. **Duplicate handling**: For 235 duplicate emails, match the first unmatched record; subsequent ones stay for manual review

#### Option B — Bulk Pre-Registration (Simpler but requires password reset)

1. **Admin edge function `bulk-register-legacy-users`**: Creates `auth.users` accounts for all 4,429 unique unmatched emails with random passwords and `email_confirm: true`
2. **Auto-match and link profiles** with legacy data (gamer_tag, tenant)
3. **Users log in via "Forgot Password?"** to set their password on first visit
4. No UI changes needed — existing login + forgot password flow handles everything

#### Option C — Hybrid (Best UX, recommended)

Combine both: bulk pre-register all legacy users so they exist in auth, then on the Auth page detect legacy users at login time and guide them to "Forgot Password?" if their first attempt fails.

1. **`bulk-register-legacy-users` edge function** — Admin-triggered, processes all 4,429 unique emails:
   - Creates auth accounts (pre-confirmed, random password)
   - Sets profile gamer_tag from legacy_username
   - Creates `user_service_interests` for tenant linkage
   - Marks legacy records as matched
   - Skips 6 emails that already overlap with existing auth accounts (auto-match those instead)
   - For 235 duplicate emails, picks the first record per email
2. **Auth page enhancement** — After a failed login attempt, check if the email exists in `legacy_users` and show a targeted message: "Welcome back! It looks like you need to set a new password for the updated platform. Check your email for a reset link." Then auto-trigger `resetPasswordForEmail`.
3. **No changes to signup flow** — New users still go through ZIP check → signup as today

### What I Recommend: Option C (Hybrid)

This gives the best experience because:
- Legacy users just go to login, type their email, get guided to reset their password
- No new signup friction — they're already registered
- Legacy data (username, tenant) is preserved automatically
- The 16 users without emails are unrecoverable and can re-register normally

### Files to Create/Change

| File | Change |
|------|--------|
| `supabase/functions/bulk-register-legacy-users/index.ts` | New edge function to bulk-create auth accounts for legacy users |
| `src/pages/Auth.tsx` | After failed login, detect legacy email and auto-trigger password reset with helpful message |
| `src/pages/admin/AdminLegacyUsers.tsx` | Add "Migrate All" button to trigger bulk registration |

### Database Changes

None required — existing tables (`legacy_users`, `profiles`, `user_service_interests`) already have the right schema. The edge function uses `matched_user_id` and `matched_at` columns that already exist.

