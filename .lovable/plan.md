

# Launch Readiness Assessment Report

## Executive Summary

The Fibre Gaming Network (FGN) platform is a feature-rich competitive gaming portal with robust RBAC, multi-tenant ISP management, tournament lifecycle, challenge/work-order systems, and community features. The application is **functionally mature** but has several gaps to address before a production launch.

---

## 1. Functional Gaps

### 1.1 Multi-Role Support (MEDIUM)
`AuthContext.tsx` fetches roles with `.maybeSingle()`, returning only **one** role per user. The `user_roles` table has a unique constraint on `(user_id, role)` but a user could hold both `admin` and `moderator` roles. Currently the first-match wins, meaning a user with both roles would only see one. This is a latent data bug.

**Recommendation**: Fetch all roles with `.select("role").eq("user_id", userId)` and derive `isAdmin`, `isModerator`, `isMarketing` from the array.

### 1.2 Coach Page Route Dead (LOW)
`/coach` redirects to `/dashboard`. The `Coach.tsx` page component exists but is only surfaced via `CoachFloatingButton`. This is fine if intentional, but the unused page file is dead code.

### 1.3 MediaLibrary Page Unreachable (LOW)
`src/pages/MediaLibrary.tsx` exists but has **no route** in `App.tsx`. It is only accessible at the admin level via `/admin/media`. If player-facing media browsing is intended, a route is missing.

### 1.4 No Global Error Boundary (MEDIUM)
There is no React Error Boundary wrapping the app. An unhandled render error in any component will crash the entire page with a blank white screen.

### 1.5 No Automated Tests (HIGH for long-term)
`src/test/example.test.ts` is a placeholder. There are zero functional tests. Test plans referenced in memory (`features/testing-infrastructure`) mention `.lovable/test-plans/` but that directory does not exist.

---

## 2. Security Review

### 2.1 RLS Coverage -- GOOD
All user-facing tables have appropriate RLS policies. The `SECURITY DEFINER` pattern (`has_role`, `is_tenant_member`, etc.) prevents recursive RLS issues. DELETE policies exist where needed (evidence, registrations, media).

### 2.2 Role Checks Server-Side -- GOOD
Admin/moderator route guards use `has_role()` in DB functions, not client-side checks.

### 2.3 `ecosystem_auth_tokens` Has No RLS Policies (MEDIUM)
This table has RLS enabled but **zero policies**, meaning no one (including service role via client) can read/write via the API. This is likely intentional (edge functions use service role key), but should be confirmed.

---

## 3. Documentation Gaps

### 3.1 README.md (HIGH)
The README is the **default Lovable template** with placeholder URLs (`REPLACE_WITH_PROJECT_ID`). It contains zero project-specific documentation.

**Recommendation**: Replace with a comprehensive README covering:
- Project overview (FGN -- Fibre Gaming Network competitive platform)
- Architecture (React + Vite + Supabase/Lovable Cloud)
- Role-based access tiers (Admin, Moderator, Marketing, Tenant Admin, Player)
- Key features summary
- Environment variables and secrets required
- Local development setup
- Database migration workflow
- Edge function inventory
- Deployment instructions

### 3.2 No CONTRIBUTING.md or ARCHITECTURE.md
For Git handoff, developers need onboarding docs explaining the codebase structure, naming conventions, and how the multi-tenant system works.

### 3.3 .lovable/plan.md Contains Stale Plan
This file still holds the "Evidence Gallery" plan from the last feature. It should be cleared or repurposed as a changelog/roadmap.

### 3.4 Edge Functions Undocumented
20 edge functions exist with no documentation of their purpose, expected inputs/outputs, or trigger mechanisms (HTTP vs. DB trigger vs. cron).

### 3.5 Migration Files Unnamed
77 migration files use auto-generated UUIDs with no descriptive naming. While Supabase generates these, a migration manifest or changelog would help developers understand schema evolution.

---

## 4. Code Quality

### 4.1 Inline `as any` Casts
`ChallengeDetail.tsx` uses multiple `as any` casts (e.g., `const c = challenge as any`). This bypasses TypeScript safety and should use proper types from the generated Supabase types.

### 4.2 Consistent Hook Patterns -- GOOD
Custom hooks follow a consistent pattern: `useQuery`/`useMutation` with proper cache invalidation and toast feedback.

### 4.3 Component Organization -- GOOD
Clear separation: `pages/`, `components/`, `hooks/`, `contexts/`. Admin, moderator, and tenant panels each have their own layout components and route guards.

---

## 5. Infrastructure & DevOps

### 5.1 No CI/CD Pipeline
No GitHub Actions, no linting on push, no automated type checking.

### 5.2 No Environment Validation
No runtime check that required environment variables (`VITE_SUPABASE_URL`, etc.) are set.

---

## 6. Recommended Actions (Priority Order)

| Priority | Action | Effort |
|----------|--------|--------|
| **P0** | Rewrite README.md with full project documentation | 1 session |
| **P0** | Fix multi-role fetch in AuthContext (`.maybeSingle()` bug) | Small |
| **P1** | Add React Error Boundary | Small |
| **P1** | Create ARCHITECTURE.md for Git handoff | 1 session |
| **P1** | Document all 20 edge functions (purpose, triggers, secrets) | 1 session |
| **P2** | Remove dead code (Coach.tsx page, unreachable MediaLibrary route) | Small |
| **P2** | Replace `as any` casts with proper Supabase types | Small |
| **P2** | Create migration changelog / manifest | Medium |
| **P3** | Add automated tests for critical paths | Large |
| **P3** | Add CI pipeline (type check + lint on push) | Medium |

---

## 7. Feature Completeness Summary

| Module | Status | Notes |
|--------|--------|-------|
| Auth & Registration (ZIP + Discord gate) | Complete | Multi-step onboarding with subscriber validation |
| RBAC (Admin/Mod/Marketing/Tenant) | Complete | Server-side enforcement via `has_role()` |
| Tournaments (CRUD, brackets, scoring) | Complete | With email/in-app notifications |
| Challenges (Work Orders) | Complete | Per-evidence review, inline video, delete |
| Leaderboard & Seasons | Complete | With rotation and snapshots |
| Achievements | Complete | With auto-criteria and tier system |
| Prize Shop & Redemptions | Complete | Point deduction, stock management |
| Ranked Ladders | Complete | ELO-based with moderator management |
| Community Forum | Complete | With likes, pinning, categories |
| AI Coach | Complete | Floating panel, game-specific, conversation history |
| Multi-tenant (ISP) Portal | Complete | Events, marketing, subscribers, billing |
| Media Library | Complete | Upload, AI generation, tagging |
| Notification System | Complete | In-app + email with per-type preferences |
| Legal Pages | Complete | Terms, Privacy, AUP, Disabled Users |
| Guides (Player/Mod/Admin) | Complete | Searchable, exportable to PDF |
| Embeddable Calendar | Complete | Public embed with tenant branding |

