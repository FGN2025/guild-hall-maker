

# Legacy User Import + Tenant Creation Plan

## Summary

Create a `legacy_users` table to store 4,740 historical user records, create real tenant records for each unique provider from the CSV, build a CSV import edge function, and add an admin UI for importing and browsing legacy data.

---

## Phase 1: Create Tenants from CSV Provider Names

From the CSV, I identified **~60 unique provider names**. After filtering out non-ISP entries (`No Provider`, `WTFast`, `Fiber Gaming Network`, `HSEL`, `IAHSEA`), there are approximately **50 real broadband providers** to create as tenants. The existing 2 test tenants ("Acme Broadband", "Fiber Fast") do not match any CSV providers.

**Real providers to create** (slug auto-generated from name):

| Provider Name | Slug |
|---|---|
| NineStar Connect | ninestar-connect |
| Huxley Communications | huxley-communications |
| Consolidated | consolidated |
| HCTC | hctc |
| Forked Deer Connect | forked-deer-connect |
| Adams Fiber | adams-fiber |
| Wabash Communications | wabash-communications |
| Paul Bunyan Communications | paul-bunyan-communications |
| Bristol Tennessee Essential Services | bristol-tennessee-essential-services |
| Alpine Communications | alpine-communications |
| DRN | drn |
| Valley TeleCom | valley-telecom |
| Mountain Telephone | mountain-telephone |
| Coast Connect | coast-connect |
| Taylor Telecom | taylor-telecom |
| Copper Valley Telecom | copper-valley-telecom |
| SC Broadband | sc-broadband |
| NEMR | nemr |
| Greenlight Community Broadband | greenlight-community-broadband |
| DTC Communications | dtc-communications |
| Mi-Fiber | mi-fiber |
| PVT | pvt |
| GRM Networks | grm-networks |
| Twin Valley | twin-valley |
| VNET Fiber | vnet-fiber |
| Nex-Tech | nex-tech |
| South Slope | south-slope |
| Haviland Broadband | haviland-broadband |
| Cleveland Utilities | cleveland-utilities |
| VTX1 | vtx1 |
| Dumont Telephone | dumont-telephone |
| Sprout Fiber Internet | sprout-fiber-internet |
| Cumberland Telephone Company | cumberland-telephone-company |
| Mid Century Fiber | mid-century-fiber |
| TCT | tct |
| Cunningham Fiber | cunningham-fiber |
| La Motte & Andrew Telephone Company | la-motte-andrew-telephone-company |
| RTC Fiber Communications | rtc-fiber-communications |
| Pioneer Communications | pioneer-communications |
| Premier Communications | premier-communications |
| SCTelcom | sctelcom |
| Kanokla | kanokla |
| Blue Valley Technologies | blue-valley-technologies |
| WCTA Fiber Internet | wcta-fiber-internet |
| Minburn Communications | minburn-communications |
| CTC | ctc |
| Intelecyn Powered by RTC Communications | intelecyn-powered-by-rtc-communications |
| CASSCOMM | casscomm |
| Bluepeak | bluepeak |
| GoSEMO Fiber | gosemo-fiber |
| Giant Communications | giant-communications |
| JBN Telephone Company | jbn-telephone-company |
| ASTAC | astac |
| DFN | dfn |
| WWest Communications | wwest-communications |
| DirectLink | directlink |
| WTC Fiber | wtc-fiber |
| Lit Fiber - Medina | lit-fiber-medina |
| PMT | pmt |
| FPUAnet | fpuanet |
| ISPN | ispn |

**Implementation**: Use the database insert tool to batch-insert these as tenant records with `status = 'active'`.

---

## Phase 2: Create `legacy_users` Table

**Database migration** to create:

```sql
CREATE TABLE public.legacy_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_username text NOT NULL,
  email text,
  first_name text,
  last_name text,
  address text,
  zip_code text,
  discord_username text,
  birthday date,
  status text DEFAULT 'unknown',
  profile_completed boolean DEFAULT false,
  provider_name text,
  tenant_id uuid REFERENCES public.tenants(id),
  invite_code text,
  legacy_created_at timestamptz,
  matched_user_id uuid,
  matched_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.legacy_users ENABLE ROW LEVEL SECURITY;

-- Admins can manage all legacy users
CREATE POLICY "Admins can manage legacy users"
  ON public.legacy_users FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Moderators can view legacy users
CREATE POLICY "Moderators can view legacy users"
  ON public.legacy_users FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'moderator'));
```

The `tenant_id` column will be auto-populated during import by matching `provider_name` to `tenants.name`.

---

## Phase 3: CSV Import Edge Function

Create `supabase/functions/import-legacy-users/index.ts`:

- Accepts a JSON array of parsed CSV rows
- For each row: extract ZIP from address, match `provider_name` to `tenants.name` to get `tenant_id`, parse birthday, insert into `legacy_users`
- Returns summary: `{ inserted, skipped, errors }`
- Uses service role key for admin-level access

---

## Phase 4: Admin Legacy Users Page

Create `src/pages/admin/AdminLegacyUsers.tsx`:

1. **Import tab**: File upload (CSV), client-side CSV parsing, preview of rows, "Import" button calling the edge function
2. **Browse tab**: Searchable/filterable table of legacy users with columns: username, email, provider, status, matched status
3. **Stats cards**: Total legacy users, matched count, unmatched count, provider distribution

Add route `/admin/legacy-users` and sidebar link.

---

## Phase 5: Auto-Match on Registration (Future)

Update the registration flow to check `legacy_users` by email on signup. If found:
- Pre-fill `gamer_tag` from `legacy_username`
- Set `matched_user_id` and `matched_at`
- Show "Welcome back!" toast

---

## Implementation Order

1. Create all tenant records via insert tool (~60 rows)
2. Create `legacy_users` table via migration
3. Build import edge function
4. Build admin UI page with import + browse
5. Wire auto-match into registration (optional follow-up)

