

# Admin-Manageable "No Providers" Message

## Overview
When a user enters a valid ZIP code but no providers serve their area, the system will display a configurable message that admins can edit from the Admin Panel. The default message will be: *"Contact your Internet Service Provider and ask them to contact Fiber Gaming Network so that you can join the Esports fun."*

## Step 1: Create `app_settings` Database Table
Create a new `app_settings` table to store key-value configuration pairs. This gives admins a flexible way to manage site-wide messages and settings.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `key` | text | Unique setting identifier |
| `value` | text | The setting value |
| `description` | text | Admin-friendly label |
| `updated_at` | timestamptz | Auto-updated |

Seed with default row:
- **key**: `no_providers_message`
- **value**: `Contact your Internet Service Provider and ask them to contact Fiber Gaming Network so that you can join the Esports fun.`
- **description**: `Message shown to users when their ZIP code has no providers`

RLS policies:
- Anyone can **read** settings (needed during registration)
- Only **admins** can update/insert/delete

## Step 2: Update the `validate-zip` Edge Function
After determining there are no providers for a valid ZIP, query the `app_settings` table for the `no_providers_message` key and include it in the response as a separate `no_providers_message` field.

## Step 3: Update `useRegistrationZipCheck` Hook
Pass the `no_providers_message` field from the edge function response through to the result object so it can be displayed in the UI.

## Step 4: Update `ZipCheckStep` Component
When a valid ZIP has zero providers, display the admin-configured message below the existing status message in a distinct callout style so users know what action to take.

## Step 5: Create Admin Settings Page
**New page**: `/admin/settings`

A simple page where admins can:
- See the current "No Providers" message in an editable text area
- Save changes with a button

Add a "Settings" link (with a gear icon) to the Admin Sidebar navigation.

## Step 6: Wire Up the Route
Add the new `/admin/settings` route to `App.tsx` wrapped in `AdminRoute`.

---

## Technical Details

### Database migration SQL
```sql
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings"
  ON public.app_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.app_settings (key, value, description)
VALUES (
  'no_providers_message',
  'Contact your Internet Service Provider and ask them to contact Fiber Gaming Network so that you can join the Esports fun.',
  'Message shown to users when their ZIP code has no providers'
);
```

### Files changed

| Action | File |
|--------|------|
| Migration | New `app_settings` table with seed data |
| Modify | `supabase/functions/validate-zip/index.ts` -- fetch message from `app_settings` |
| Modify | `src/hooks/useRegistrationZipCheck.ts` -- pass through `no_providers_message` |
| Modify | `src/components/auth/ZipCheckStep.tsx` -- render the message |
| Create | `src/pages/admin/AdminSettings.tsx` -- admin settings page |
| Modify | `src/components/admin/AdminSidebar.tsx` -- add Settings nav link |
| Modify | `src/App.tsx` -- add `/admin/settings` route |
