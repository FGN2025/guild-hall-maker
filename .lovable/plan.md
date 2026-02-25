

## Make Integrations More Discoverable

Right now, the Integrations tab is hidden inside the Subscribers page — users have to navigate to Subscribers and then click the "Integrations" tab. This plan adds a dedicated **Integrations** sidebar link that navigates directly to the Subscribers page with the Integrations tab pre-selected.

### Changes

**1. Add "Integrations" link to the Tenant Sidebar** (`src/components/tenant/TenantSidebar.tsx`)
- Add a new entry to `allSidebarItems` with a `Plug` icon (from lucide-react), label "Integrations", route `/tenant/subscribers?tab=integrations`, and restricted to `admin` role.
- Position it right after the existing "Subscribers" entry so the two related items are grouped together.
- Update the `active` detection logic so this item highlights when the current URL includes `tab=integrations`.

**2. Update TenantSubscribers to read the tab from URL** (`src/pages/tenant/TenantSubscribers.tsx`)
- Read the `tab` query parameter from the URL using `useSearchParams`.
- Use it to control the `Tabs` component's `value` / `onValueChange` so that navigating to `?tab=integrations` opens the Integrations tab directly.
- When a user clicks a different tab, update the URL query param to keep things in sync (so the sidebar highlight stays accurate and the URL is shareable).

### Result
- A clearly visible **Integrations** link with a plug icon appears in the sidebar for admin users.
- Clicking it jumps straight to the Integrations tab — no extra clicks needed.
- The sidebar link highlights correctly when viewing integrations.
- All existing tab navigation within the Subscribers page continues to work normally.

