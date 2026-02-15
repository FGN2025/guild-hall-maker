

# FGN Ecosystem Integration Plan

## Current Ecosystem

```text
+-------------------+     +--------------------+     +-------------------+
|  play.fgn.gg      |     |  manage.fgn.gg     |     |  hub.fgn.gg       |
|  Gaming Platform   |     |  Subscriber Mgmt   |     |  Partner Hub      |
|                   |     |                    |     |                   |
| - Tournaments     |     | - NISC/GLDS APIs   |     | - Creative Assets |
| - Leaderboards    |     | - Verification     |     | - Marketing       |
| - Provider Admin  |     | - Access Codes     |     | - Web Pages       |
| - Subscriber Mgmt |     |                    |     | - Brand Kits      |
+-------------------+     +--------------------+     +-------------------+
```

All three are Lovable apps with independent authentication. None currently have API endpoints for cross-app communication.

## What This Plan Covers

### 1. Add hub.fgn.gg to the Integrations Tab

Add a fourth integration card on the `/provider/subscribers` Integrations tab for hub.fgn.gg, marked as "Coming Soon" alongside manage.fgn.gg. This gives providers visibility into the planned connection.

**File**: `src/pages/provider/ProviderSubscribers.tsx`
- Add an entry to the `availableIntegrations` array with `providerType: "hub_fgn"` and `comingSoon: true`

### 2. Add Cross-App Navigation Links

Add a dedicated "FGN Ecosystem" section to the Provider Sidebar with external links to the other two apps. This gives provider admins quick access without needing to remember URLs.

**File**: `src/components/provider/ProviderSidebar.tsx`
- Add an "Ecosystem" section at the bottom of the nav (above "Back to App") with external links to manage.fgn.gg and hub.fgn.gg
- Use `ExternalLink` icon to indicate these open in new tabs

### 3. Future API Integration Groundwork

The `tenant_integrations` table already supports a flexible `provider_type` field and `additional_config` JSONB column. When hub.fgn.gg adds API endpoints, we can store its connection config with `provider_type: 'hub_fgn'` and use the same proxy edge function pattern planned for manage.fgn.gg.

Planned future data flows from Hub:
- **Marketing assets**: Logos, banners, tournament graphics per tenant
- **Brand kit references**: Colors, fonts, templates for auto-generating collateral
- **Web page content**: Landing page blocks or promotional content

No database changes are needed for this phase.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/provider/ProviderSubscribers.tsx` | Add hub.fgn.gg integration card |
| `src/components/provider/ProviderSidebar.tsx` | Add Ecosystem external links section |

## Technical Notes

- External links use `target="_blank"` and `rel="noopener noreferrer"` for security
- The `tenant_integrations` table is already flexible enough to store hub.fgn.gg config when ready
- No new database tables or migrations are needed
- When either manage.fgn.gg or hub.fgn.gg exposes API endpoints, the same shared-key + edge-function-proxy pattern applies to both

