## Change

In `src/pages/tenant/TenantSubscribers.tsx`, remove the two "Coming Soon" entries from the `availableIntegrations` array:
- `manage.fgn.gg` (providerType: `manage_fgn`)
- `hub.fgn.gg` (providerType: `hub_fgn`)

The Integrations tab will then show only NISC, GLDS, and FGN Academy.

No other files, backend, or database changes needed.
