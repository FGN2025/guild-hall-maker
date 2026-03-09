

## Plan: Fix All 4,740 Legacy User Records

### Current State

| Category | Count | Status |
|----------|-------|--------|
| Already mapped to a tenant | **4,609** | tenant_id is set correctly |
| Unmapped (tenant_id IS NULL) | **131** | Needs fixing |
| Matched to a real user account | **0** | All 4,740 are unmatched (matched_user_id is NULL) |

The 4,609 already-mapped records are fine — they have the correct tenant_id and will appear in their respective Tenant Player Directories. The problem is only the **131 NULL tenant_id records**.

### Breakdown of the 131 Unmapped Records

| Provider Name | Count | Fix |
|---|---|---|
| Co-Mo Connect | 43 | Map to existing tenant `10a5166c...` |
| Preston Telephone Company | 17 | Map to existing tenant `6bc875f1...` |
| Marne Elk Horn | 3 | Map to existing tenant `7c3c06e6...` |
| Heart of Iowa Communications | 2 | Map to existing tenant `aaf87537...` |
| HCI | 2 | Map to existing tenant `63c06cbb...` |
| WTFast | 26 | Map to FGN tenant `d12d8519...` |
| DxTEL | 22 | Map to FGN tenant |
| IAHSEA | 13 | Map to FGN tenant |
| HSEL | 3 | Map to FGN tenant |

### Execution — Two Data Updates (no code changes)

**Update 1** — Map 67 records to their matching tenants:
```sql
UPDATE legacy_users SET tenant_id = '10a5166c-398f-4fb6-bf03-e0cb2e8899bd' WHERE provider_name = 'Co-Mo Connect' AND tenant_id IS NULL;
UPDATE legacy_users SET tenant_id = '6bc875f1-ac31-45a8-8053-cecf1bc9a477' WHERE provider_name = 'Preston Telephone Company' AND tenant_id IS NULL;
UPDATE legacy_users SET tenant_id = '7c3c06e6-0b97-4c4c-af56-8018529ba4c2' WHERE provider_name = 'Marne Elk Horn' AND tenant_id IS NULL;
UPDATE legacy_users SET tenant_id = 'aaf87537-1c2a-47f5-93cd-25bce2884aca' WHERE provider_name = 'Heart of Iowa Communications' AND tenant_id IS NULL;
UPDATE legacy_users SET tenant_id = '63c06cbb-0879-47d6-bac6-3c58acf360fe' WHERE provider_name = 'HCI' AND tenant_id IS NULL;
```

**Update 2** — Map remaining 64 orphans (WTFast, DxTEL, IAHSEA, HSEL) to Fiber Gaming Network:
```sql
UPDATE legacy_users SET tenant_id = 'd12d8519-4f30-4d98-9069-e614ee593f98' WHERE tenant_id IS NULL;
```

**Update 3** — Update the import edge function to default to FGN for future imports with no provider match.

### Result After Execution
- **All 4,740** records will have a tenant_id (zero NULLs)
- All will appear in their respective Tenant Player Directories automatically (the existing `useTenantPlayers` hook already queries by tenant_id)
- The "No Provider" group (1,088 records) is already mapped to a tenant — no action needed there

### Files

| File | Change |
|------|--------|
| Data updates (6 SQL statements) | Fix 131 NULL tenant_id records |
| `supabase/functions/import-legacy-users/index.ts` | Default unmapped providers to FGN tenant |

