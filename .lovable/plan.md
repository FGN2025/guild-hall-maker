

## Plan: Align Tenant Event Creation with Tournament Creation

### Current Gaps

The Create Event form uses basic inputs while Create Tournament has rich components. Here's what's missing:

| Feature | Tournament | Event |
|---------|-----------|-------|
| Game dropdown from catalog | `useGames` Select | Free-text Input |
| Multi-date calendar picker | Calendar + time input | datetime-local |
| Hero image upload + Media Library | Upload + MediaPickerDialog | Missing |
| Prize type selector (None/Physical/Value) | PrizePoolSelector component | Plain text input |
| Prize distribution %s | PrizePctFirst/Second/Third | Missing |
| Participation Points | Number input | Missing |
| Discord Role on registration | useDiscordRoles Select | Missing |
| Rules PDF auto-link from game | Game PDF detection + toggle | Plain textarea |
| Format: Battle Royale | Available | Missing (has Free for All) |

Event-only features preserved: Social Copy, Registration Open, Public toggle, End Date, Campaign Code Linker.

### Database Migration

Add 7 columns to `tenant_events`:

```sql
ALTER TABLE public.tenant_events
  ADD COLUMN IF NOT EXISTS prize_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS prize_id uuid,
  ADD COLUMN IF NOT EXISTS points_participation integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS discord_role_id text,
  ADD COLUMN IF NOT EXISTS prize_pct_first integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS prize_pct_second integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS prize_pct_third integer DEFAULT 20;
```

### File Changes

**1. `src/hooks/useTenantEvents.ts`**
- Add new columns to `TenantEvent` interface and `TenantEventInsert` type

**2. `src/pages/tenant/TenantEvents.tsx`** (main change)
- Import: `useGames`, `useDiscordRoles`, `useImageLimits`, `validateAndToast`, `MediaPickerDialog`, `PrizePoolSelector`, `Calendar`, `Popover`
- **Game**: Replace `<Input>` with `<Select>` populated by `useGames()`
- **Dates**: Replace `datetime-local` with multi-date `Calendar` picker + time input (matching tournament pattern)
- **Image**: Add hero image upload button + Media Library picker + preview thumbnail
- **Prize**: Replace text input with `PrizePoolSelector` component (handles prize type, value, distribution %s)
- **Points**: Add Participation Points number input
- **Discord**: Add Discord Role dropdown via `useDiscordRoles`
- **Rules**: Add PDF auto-link detection based on selected game's `tournament_rules_url`
- **Format**: Replace "free_for_all" with "battle_royale" to match tournament options
- Update form state, `resetForm`, `openEdit`, and `handleSubmit` to handle all new fields including image upload to storage + media library registration
- Keep event-specific fields (social_copy, registration_open, is_public, end_date, CampaignCodeLinker)

### Level of Effort
- 1 database migration (7 columns)
- 1 type update (useTenantEvents.ts)
- 1 major form rewrite (TenantEvents.tsx)
- All components already exist — no new components needed

