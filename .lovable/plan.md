# Tenant Audit — Wave 2 Status (closed 2026-06-22)

| Item | Description | Status |
|---|---|---|
| 2.1 | Tenant health summary RPC + coverage badges on AdminTenants | ✅ Done |
| 2.2 | ZIP multi-tenant overlap warning on TenantZipCodes | ✅ Done |
| 2.3 | Academy key enforcement / per-tenant gate | ⏭️ Closed — no action (handoff verified healthy in prod; see `docs/fgn-academy-integration.md` § Audit 2.3) |
| 2.4 | RLS hardening on `provider_inquiries` (anon insert scoped to `status='new'`, internal triage fields blocked) | ✅ Done |
| 2.5 | Lead email visibility on TenantLeads | ✅ Already satisfied (no email column rendered; export still uses masked RPC) |

Wave 2 complete. Next: Wave 3 planning.
