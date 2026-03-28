

## Plan: Broaden Reference Types + Dynamic Notebook Lookup

### Changes

**1. Rename "CFR Reference" → "Regulatory Reference" with a type selector**

- Add a reference type dropdown: `Federal (CFR)`, `State Training Requirement`, `Industry Standard`, `Other`
- Rename the text field to "Reference Citation" — free-text, no format restriction
- Update `cdlDomainMaps.ts` default references to keep their CFR values but allow overrides
- Update the 18-point validation (check #11) to allow any non-empty reference string instead of requiring "49 CFR" or "Part" prefix — the type dropdown provides the classification instead

**2. Dynamic notebook lookup from `admin_notebook_connections`**

- Update `generate-cdl-challenge` edge function to query `admin_notebook_connections` for the notebook tagged to the ATS game (or a new `purpose` field like `cdl-agent`) instead of using the hardcoded `notebook:w6l0wjpi39u5nlpaj0k3`
- Fall back to the hardcoded ID if no matching connection is found
- This way, if you change the CDL notebook in Admin → Notebooks, the agent picks it up automatically

### Files Changed

| File | Change |
|------|--------|
| `src/lib/cdlDomainMaps.ts` | Add `referenceType` field to domain configs (default: `"federal_cfr"`) |
| `src/pages/moderator/ModeratorCDLGenerate.tsx` | Add reference type dropdown, rename "CFR Reference" label to "Regulatory Reference" |
| `supabase/functions/generate-cdl-challenge/index.ts` | (a) Query `admin_notebook_connections` for notebook ID instead of hardcoding. (b) Relax validation check #11 to accept any non-empty `regulatory_reference` string. (c) Include `reference_type` in prompt and output. |

### Schema note
The `cfr_reference` column on the `challenges` table stays as-is — it can store any reference string regardless of type. The reference type classification lives in the challenge metadata/description rather than needing a new column.

