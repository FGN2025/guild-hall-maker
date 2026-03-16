

## Blacknut Cloud Gaming — Phased Implementation Plan

### Current State

The database layer is **fully ready**:
- **`tenant_cloud_gaming`** — per-tenant config (is_enabled, blacknut_account_id, max_seats, subscription_tier)
- **`cloud_games`** — shared game catalog (blacknut_game_id, title, cover_url, genre, deep_link_url)
- **`subscriber_cloud_access`** — per-user seat tracking (tenant_id, user_id, is_active, activated/deactivated timestamps)
- **RLS policies** — all three tables have proper policies for tenant admins, platform admins, and authenticated users

**What's missing**: zero front-end code, zero hooks, zero edge functions. No Blacknut API key stored yet.

---

### Phase 1 — Tenant Config UI + Manual Game Catalog (No API key needed)

Build the management interfaces that work entirely with manual data entry.

**Files to create:**
| File | Purpose |
|---|---|
| `src/hooks/useTenantCloudGaming.ts` | Hook for tenant_cloud_gaming CRUD + subscriber_cloud_access queries |
| `src/hooks/useCloudGames.ts` | Hook for cloud_games catalog CRUD (admin) + read (all users) |
| `src/components/tenant/CloudGamingConfigCard.tsx` | Settings card on Tenant Settings page — toggle enable, set max seats, subscription tier |
| `src/pages/admin/AdminCloudGaming.tsx` | Admin page for managing the cloud_games catalog (add/edit/delete games manually) |
| `src/components/admin/CloudGameFormDialog.tsx` | Dialog for adding/editing a cloud game entry |

**Files to edit:**
| File | Change |
|---|---|
| `src/pages/tenant/TenantSettings.tsx` | Add CloudGamingConfigCard below existing settings cards |
| `src/components/admin/AdminSidebar.tsx` | Add "Cloud Gaming" nav link |
| `src/App.tsx` | Add `/admin/cloud-gaming` route |

**What this delivers**: Tenant admins can enable cloud gaming and set seat limits. Platform admins can manually populate the game catalog with titles, descriptions, cover images, genres, and deep-link URLs — all without needing the Blacknut API.

---

### Phase 2 — Player-Facing Game Catalog Page

Create the public browsing experience for cloud games.

**Files to create:**
| File | Purpose |
|---|---|
| `src/pages/CloudGaming.tsx` | Public page at `/cloud-gaming` — grid of cloud games with genre filter, search, and "Play" deep-link buttons |

**Files to edit:**
| File | Change |
|---|---|
| `src/App.tsx` | Add `/cloud-gaming` route under ConditionalLayout |
| `src/components/AppSidebar.tsx` | Add "Cloud Gaming" nav link for authenticated users |

**Access control**: The "Play" button only appears for users with an active seat in `subscriber_cloud_access`. Users without access see an informational prompt to contact their provider.

---

### Phase 3 — Tenant Seat Management

Let tenant admins assign and revoke cloud gaming seats for their subscribers.

**Files to create:**
| File | Purpose |
|---|---|
| `src/components/tenant/CloudGamingSeatsPanel.tsx` | Tab/panel showing active seats, available seats, assign/revoke controls |

**Files to edit:**
| File | Change |
|---|---|
| `src/pages/tenant/TenantSubscribers.tsx` (or TenantSettings) | Add a "Cloud Gaming Seats" tab or section |
| `src/components/tenant/TenantSidebar.tsx` | Add "Cloud Gaming" nav link for tenant admins |

**What this delivers**: Tenant admins can see how many seats are used vs. max_seats, assign access to specific subscribers, and revoke access. All manual — no Blacknut API needed.

---

### Phase 4 — Blacknut API Integration (Requires API Key)

Once the Blacknut API key is available, add automated catalog sync and account provisioning.

**Files to create:**
| File | Purpose |
|---|---|
| `supabase/functions/blacknut-catalog-sync/index.ts` | Edge function to fetch Blacknut's game catalog and upsert into `cloud_games` |
| `supabase/functions/blacknut-provision-seat/index.ts` | Edge function to activate/deactivate a subscriber seat via Blacknut's API |

**Files to edit:**
| File | Change |
|---|---|
| `src/hooks/useTenantCloudGaming.ts` | Add `syncCatalog` and `provisionSeat` mutations that invoke edge functions |
| `src/pages/admin/AdminCloudGaming.tsx` | Add "Sync from Blacknut" button alongside manual management |

**Secret needed**: `BLACKNUT_API_KEY` — will be stored via the secrets tool when ready.

---

### Phase 5 — Stripe Metered Billing for Seats

Wire seat activation/deactivation to Stripe usage-based billing.

**Changes:**
- Create a Stripe metered price for "Cloud Gaming Seat"
- Update the seat provisioning edge function to report usage to Stripe
- Add billing summary to the Tenant Settings Cloud Gaming card (active seats × per-seat price)

---

### Recommended Starting Point

**Phase 1** can be implemented immediately — it builds the full admin and tenant configuration layer with zero external dependencies. This lets you populate the game catalog, configure tenants, and validate the data model before the API key arrives.

