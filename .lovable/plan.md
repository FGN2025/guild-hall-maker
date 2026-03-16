

# Phase 3: Subscriber Cloud Gaming Seat Purchases

## Context
- `subscriber_cloud_access` table exists (tracks active seats per tenant/user)
- `tenant_cloud_gaming` config exists (max_seats, tier, enabled flag)
- `cloud_gaming_seat` Stripe product defined ($29.99/mo) in `stripeProducts.ts`
- `create-checkout` edge function already supports both `subscription` and `payment` modes
- No Blacknut API yet — seats are tracked locally only (no external provisioning)

## Database Migration

### New table: `subscriber_cloud_purchases`
Tracks Stripe subscription per cloud gaming seat assignment.

```sql
CREATE TABLE public.subscriber_cloud_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES public.tenant_subscribers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  canceled_at timestamptz,
  UNIQUE (tenant_id, subscriber_id)
);

ALTER TABLE public.subscriber_cloud_purchases ENABLE ROW LEVEL SECURITY;

-- Tenant members can view their tenant's purchases
CREATE POLICY "Tenant members can view purchases"
  ON public.subscriber_cloud_purchases FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));

-- Tenant admins can manage purchases
CREATE POLICY "Tenant admins can insert purchases"
  ON public.subscriber_cloud_purchases FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()));

CREATE POLICY "Tenant admins can update purchases"
  ON public.subscriber_cloud_purchases FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()));

-- updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.subscriber_cloud_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

## Files to Create

### 1. `src/hooks/useCloudGamingSeats.ts`
- Queries `subscriber_cloud_access` for the tenant (active seats list with subscriber details)
- Queries `subscriber_cloud_purchases` for purchase status
- `assignSeat(subscriberId)` — inserts into `subscriber_cloud_access` (local-only, no Blacknut), creates a purchase record, and invokes `create-checkout` with `cloud_gaming_seat` price
- `revokeSeat(accessId)` — deactivates the seat (sets `is_active = false`, `deactivated_at = now()`)
- Returns: `seats`, `purchases`, `isLoading`, `assignSeat`, `revokeSeat`, `availableSlots`

### 2. `src/components/tenant/CloudGamingSeatsCard.tsx`
- Displays active seat count vs max_seats from cloud gaming config
- Table of assigned seats: subscriber name, email, status, assigned date, actions (revoke)
- "Assign Seat" button opens a subscriber picker (simple select from `tenant_subscribers` not already assigned)
- Seat assignment creates a local record; since no Blacknut API exists yet, shows a "Pending Integration" badge
- Disabled when cloud gaming is not enabled for the tenant

## Files to Edit

### 3. `src/pages/tenant/TenantSettings.tsx`
- Import and render `<CloudGamingSeatsCard>` below the existing `<CloudGamingConfigCard>`
- Only shown when cloud gaming is enabled

### 4. `src/components/tenant/CloudGamingConfigCard.tsx`
- No changes needed — seats card is separate

## Technical Notes
- Since Blacknut API is not available, seat assignment is **local tracking only**. The UI will indicate this with a notice: "Cloud gaming seats are tracked locally. Blacknut account provisioning will be enabled when the API integration is configured."
- The `create-checkout` edge function already handles `cloud_gaming_seat` price — we pass `mode: 'subscription'` for recurring billing per seat
- Seat count validation: check `activeSeats < config.max_seats` before allowing assignment

