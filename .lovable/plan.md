## Recommended next step — PR P-3: complete the payload contract Academy is waiting on

Academy's Phase F receiver is live but blocked on three additive fields in our outbound payload. Once we ship these, Academy can:

- Key `play_identity` on `metadata.external_user_id` (instead of fuzzy-matching by email)
- Use `metadata.external_attempt_id` as a hard idempotency key (instead of best-effort)
- Stamp progress rows with `metadata.tenant_id` / `tenant_slug` / `tenant_name` for cohort dashboards

This is purely additive — no breaking changes to the contract in `docs/play-fgn-gg-integration-guide.md` §4.

---

### 1. Database — add a stable per-attempt UUID to `challenge_enrollments`

Migration:

```sql
ALTER TABLE public.challenge_enrollments
  ADD COLUMN IF NOT EXISTS external_attempt_id uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_challenge_enrollments_external_attempt_id
  ON public.challenge_enrollments(external_attempt_id);
```

Notes:
- `DEFAULT gen_random_uuid()` backfills every existing row with a unique value in one shot — no separate UPDATE pass needed.
- The UUID is **stable across retries** of the same enrollment (we never regenerate it). If a player un-enrolls and re-enrolls later, that's a new row → new ID, which is the behavior Academy wants.
- No RLS changes — the column rides on the existing enrollment policies.

### 2. Edge function — extend `sync-to-academy/index.ts`

Pull the new fields and add them to the `metadata` block. All four are additive — existing keys stay untouched.

a) After the existing `enrollment` lookup (currently `select("id")`), also pull `external_attempt_id`:

```ts
const { data: enrollment } = await adminClient
  .from("challenge_enrollments")
  .select("id, external_attempt_id")
  .eq("user_id", user_id)
  .eq("challenge_id", challenge_id)
  .single();
```

b) Resolve tenant context using the existing `get_user_tenant` RPC + `tenants` lookup:

```ts
let tenantId: string | null = null;
let tenantSlug: string | null = null;
let tenantName: string | null = null;
const { data: tId } = await adminClient.rpc("get_user_tenant", { _user_id: user_id });
if (tId) {
  tenantId = tId as string;
  const { data: t } = await adminClient
    .from("tenants")
    .select("slug, name")
    .eq("id", tenantId)
    .single();
  tenantSlug = t?.slug ?? null;
  tenantName = t?.name ?? null;
}
```

c) Extend the `metadata` block in the payload:

```ts
metadata: {
  source: "play.fgn.gg",
  external_user_id: user_id,
  external_attempt_id: enrollment?.external_attempt_id ?? null,
  tenant_id: tenantId,
  tenant_slug: tenantSlug,
  tenant_name: tenantName,
  display_name: profile?.display_name || userEmail,
  challenge_name: (challenge as any)?.name || "Unknown Challenge",
  description: (challenge as any)?.description || null,
  difficulty: (challenge as any)?.difficulty || null,
  game_name: (challenge as any)?.games?.name || null,
  awarded_points: actualPoints,
  max_points: maxPoints,
},
```

Note: `external_user_id` is already being sent — we only need to add the other three. Keep the payload object identical between the direct-POST and the webhook-dispatch envelope so Phase E shadow-mode parity stays clean (no separate code path needed since `dispatchPhaseE` already serializes the same `payload`).

### 3. Documentation — update the contract

Edit `docs/play-fgn-gg-integration-guide.md`:

- §4 example payload: add the three new keys to the `metadata` block.
- §4.1 field reference: add a short row for each new field describing required/optional and meaning.
- §10 Q&A: append a Q7 noting "P-3 metadata additions (`external_attempt_id`, `tenant_id`, `tenant_slug`, `tenant_name`) shipped — Academy may key idempotency and tenant cohorts off these."

Edit `docs/phase-f-status-and-open-asks.md`:

- Mark items #1, #2, and #4 as **shipped** (leave #3 P-2 rollout window and #5 webhook HMAC scheme open for the next round).

### 4. Smoke test

Manual verification after deploy:

```bash
# Trigger a real challenge approval in the Mod or Admin Challenges UI, then:
supabase functions logs sync-to-academy --tail 50
```

Expect the logged payload to contain all four new metadata keys with non-null values for any user who has a tenant. For staff users without a tenant, `tenant_id` will be `null` — that's expected and acceptable per the contract.

Optional: add a quick read-only check in the **Admin → Ecosystem → Sync Health** page (`src/pages/admin/AdminEcosystem.tsx`) to surface the latest payload's `external_attempt_id` so we can confirm uniqueness without log diving. Defer if that page already shows recent rows clearly.

---

## Files touched

- New migration adding `external_attempt_id` to `challenge_enrollments`
- `supabase/functions/sync-to-academy/index.ts` — enrollment select + tenant lookup + metadata block
- `docs/play-fgn-gg-integration-guide.md` — payload + field reference + Q7
- `docs/phase-f-status-and-open-asks.md` — mark items shipped

## Out of scope for this step

- Phase E mode flip (`off` → `shadow`) — comes after P-3 lands so the parity check has the new fields visible
- PR P-2 doc cleanup — separate small pass
- Webhook HMAC receiver-recipe doc — separate small pass

## Risk

Low. The migration is additive with a default value (no nullability risk, no RLS change). The edge function change only adds keys to `metadata`, which Academy explicitly tolerates per integration doc §4.1 ("extra context fields; academy may store or ignore"). Phase E shadow/live behavior is unaffected because both paths serialize the same `payload` object.
