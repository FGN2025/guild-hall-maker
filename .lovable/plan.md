

## ZIP-Gated Registration with Bypass Code

### Overview
Modify the registration flow so that during signup, new users must either pass a ZIP code coverage check (verifying they are within a broadband provider's service area) or enter a valid bypass code to skip the check. This is the single integration point between the broadband provider system and the gaming platform -- the only shared touchpoint.

### How It Works

The signup form gains two new fields: **ZIP Code** (required) and **Bypass Code** (optional). The flow works as follows:

```text
User fills signup form (name, email, password, ZIP code)
         |
         v
  Has bypass code? ---- YES ----> Validate code against DB
         |                              |
         NO                       Valid? -- YES --> Create account, skip ZIP check
         |                              |
         v                        NO --> Show error
  Check ZIP against national DB
         |
    Valid ZIP? ---- NO ----> "Invalid ZIP code"
         |
        YES
         |
  Check ZIP against tenant_zip_codes
         |
  Matches providers? -- NO ----> "No providers in your area" (still allow signup but no provider link)
         |
        YES
         |
  Create account + store matched providers in user_service_interests
  Show user which providers serve their area
```

### Database Changes

**1. New table: `bypass_codes`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| code | text | Unique, the actual bypass code string |
| description | text | Admin note (e.g. "VIP invite batch 1") |
| max_uses | integer | Nullable -- null means unlimited |
| times_used | integer | Default 0 |
| expires_at | timestamptz | Nullable -- null means never expires |
| created_by | uuid | FK to auth.users (the admin who created it) |
| is_active | boolean | Default true |
| created_at | timestamptz | Auto |

RLS: Only super admins can create/update/delete. The validation will happen via a security definer function so no direct user read access is needed.

**2. Add `zip_code` column to `profiles` table**
- `zip_code text` -- stores the user's ZIP at registration time

**3. New database function: `validate_bypass_code(code text)`**
- Security definer function (bypasses RLS)
- Checks the code exists, is active, not expired, and under max_uses
- Returns boolean
- If valid, increments `times_used`

**4. New database function: `lookup_providers_by_zip(zip text)`**
- Returns matching tenants for a given ZIP code
- Joins `tenant_zip_codes` with `tenants` where tenant status is active

### Changes to Registration Flow (Auth.tsx)

The signup form will be updated to a **two-step process**:

**Step 1**: Email, password, display name (existing fields) + ZIP code + optional bypass code
**Step 2**: If ZIP check found providers, show them before completing. If bypass code was used, skip directly to account creation.

The ZIP validation and provider lookup happen **before** the Supabase `signUp` call. This prevents creating accounts that fail the check.

### Admin Management

- Add a **Bypass Codes** section to the super admin panel (`/admin/bypass-codes`)
- Super admins can create codes with optional expiry and usage limits
- View usage stats for each code

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/auth/ZipCheckStep.tsx` | ZIP code input + bypass code field + provider results display |
| `src/pages/admin/AdminBypassCodes.tsx` | Admin page to manage bypass codes |
| `src/hooks/useBypassCodes.ts` | Hook for bypass code CRUD |
| `src/hooks/useRegistrationZipCheck.ts` | Hook that validates ZIP, checks bypass code, and finds providers |

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Add ZIP code and bypass code fields to signup; two-step registration flow; call ZIP validation before signUp |
| `src/components/admin/AdminSidebar.tsx` | Add "Bypass Codes" nav item |
| `src/App.tsx` | Add `/admin/bypass-codes` route |

### Technical Details

**Database migration SQL:**
```text
-- Bypass codes table
CREATE TABLE public.bypass_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  max_uses INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bypass_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bypass codes"
  ON public.bypass_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add ZIP to profiles
ALTER TABLE public.profiles ADD COLUMN zip_code TEXT;

-- Validate bypass code (security definer, no RLS needed for callers)
CREATE OR REPLACE FUNCTION public.validate_bypass_code(_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _record RECORD;
BEGIN
  SELECT * INTO _record FROM public.bypass_codes
  WHERE code = _code AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;
  IF _record.expires_at IS NOT NULL AND _record.expires_at < now() THEN RETURN false; END IF;
  IF _record.max_uses IS NOT NULL AND _record.times_used >= _record.max_uses THEN RETURN false; END IF;

  UPDATE public.bypass_codes SET times_used = times_used + 1 WHERE id = _record.id;
  RETURN true;
END;
$$;

-- Lookup providers by ZIP
CREATE OR REPLACE FUNCTION public.lookup_providers_by_zip(_zip TEXT)
RETURNS TABLE(tenant_id UUID, tenant_name TEXT, tenant_slug TEXT, logo_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name, t.slug, t.logo_url
  FROM tenant_zip_codes tz
  JOIN tenants t ON t.id = tz.tenant_id
  WHERE tz.zip_code = _zip AND t.status = 'active';
$$;
```

**Registration flow logic (in Auth.tsx):**
1. When user is signing up, show ZIP code field (required) and bypass code field (optional)
2. On submit, if bypass code is provided, call `validate_bypass_code` RPC first
3. If no bypass code, validate ZIP against `national_zip_codes`, then call `lookup_providers_by_zip`
4. If ZIP is invalid nationally, show error and block signup
5. If ZIP is valid but no providers match, allow signup but inform user no providers serve their area
6. If providers found, show them, then proceed with signup
7. After successful signup, store ZIP in profile metadata and create `user_service_interests` rows for matched providers

### Implementation Sequence

1. Database migration (bypass_codes table, profiles zip_code column, two functions)
2. Registration ZIP check hook
3. Update Auth.tsx with two-step signup flow
4. Bypass codes admin page
5. Wire up admin sidebar route

