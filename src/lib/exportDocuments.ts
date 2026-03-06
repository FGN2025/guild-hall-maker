const PRINT_STYLES = `
  body { font-family: system-ui, -apple-system, sans-serif; color: #1a1a1a; padding: 40px; max-width: 900px; margin: auto; font-size: 13px; line-height: 1.6; }
  h1 { font-size: 26px; margin-bottom: 4px; color: #111; border-bottom: 3px solid #0ee; padding-bottom: 8px; }
  h2 { font-size: 18px; margin-top: 32px; border-bottom: 2px solid #0ee; padding-bottom: 4px; page-break-before: auto; }
  h3 { font-size: 15px; margin-top: 20px; color: #333; }
  h4 { font-size: 13px; margin-top: 16px; color: #444; }
  p { margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
  th, td { text-align: left; padding: 6px 10px; border: 1px solid #ddd; }
  th { background: #f5f5f5; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
  code { background: #f4f4f4; padding: 1px 5px; border-radius: 3px; font-size: 12px; font-family: 'SF Mono', Monaco, Consolas, monospace; }
  pre { background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 6px; padding: 14px; overflow-x: auto; font-size: 11px; line-height: 1.5; margin: 10px 0; }
  pre code { background: none; padding: 0; }
  ul, ol { margin: 6px 0; padding-left: 24px; }
  li { margin: 3px 0; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .header .date { font-size: 11px; color: #888; }
  .badge { display: inline-block; background: #0aa; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  hr { border: none; border-top: 1px solid #e0e0e0; margin: 20px 0; }
  blockquote { border-left: 3px solid #0ee; padding-left: 12px; margin: 10px 0; color: #555; font-style: italic; }
  @media print { body { padding: 20px; } h2 { page-break-before: auto; } pre { white-space: pre-wrap; word-break: break-all; } }
`;

function openPrintWindow(title: string, bodyHtml: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_STYLES}</style></head><body>
<div class="header"><div><span class="badge">FGN</span></div><div class="date">Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div></div>
${bodyHtml}
</body></html>`;
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function exportReadmePdf() {
  const body = `
<h1>Fibre Gaming Network (FGN) — play.fgn.gg</h1>
<p>A competitive gaming platform connecting ISP-sponsored communities with tournaments, challenges, ranked ladders, and achievement systems. Built for multi-tenant broadband providers who want to offer branded esports experiences to their subscribers.</p>
<p><strong>Production URL</strong>: <a href="https://play.fgn.gg">https://play.fgn.gg</a></p>
<hr>

<h2>Tech Stack</h2>
<table>
<thead><tr><th>Layer</th><th>Technology</th></tr></thead>
<tbody>
<tr><td>Frontend</td><td>React 18 + TypeScript + Vite</td></tr>
<tr><td>Styling</td><td>Tailwind CSS + shadcn/ui + custom design tokens</td></tr>
<tr><td>State</td><td>TanStack React Query (server state), React Context (auth)</td></tr>
<tr><td>Backend</td><td>Lovable Cloud (Supabase) — Auth, PostgreSQL, Edge Functions, Storage</td></tr>
<tr><td>Routing</td><td>React Router v6 (SPA with nested layouts)</td></tr>
<tr><td>Animations</td><td>tsparticles (hero backgrounds)</td></tr>
<tr><td>Forms</td><td>React Hook Form + Zod validation</td></tr>
<tr><td>Charts</td><td>Recharts</td></tr>
<tr><td>Drag &amp; Drop</td><td>@dnd-kit</td></tr>
</tbody></table>

<h2>Architecture Overview</h2>
<pre><code>src/
├── components/           # Reusable UI components
│   ├── admin/            # Admin panel layouts, route guards
│   ├── moderator/        # Moderator panel layouts &amp; route guard
│   ├── tenant/           # ISP tenant portal layouts &amp; route guard
│   ├── tournaments/      # Tournament cards, brackets, prize display
│   ├── challenges/       # Challenge cards, evidence upload, task checklists
│   ├── coach/            # AI coach chat history panel
│   ├── auth/             # Registration sub-steps (ZIP check, subscriber verify)
│   ├── compare/          # Player comparison charts and tables
│   ├── games/            # Game cards, add game dialog
│   ├── media/            # Media library grid, uploader, AI image generator
│   ├── player/           # Player profile header, stats grid, achievements
│   ├── stats/            # Game stats, player stats report, skill insights
│   ├── ui/               # shadcn/ui primitives (50+ components)
│   └── ...               # Navbar, Sidebar, ErrorBoundary, etc.
├── contexts/
│   ├── AuthContext.tsx    # Session, roles, Discord status
│   └── CoachContext.tsx   # AI coach conversation state
├── hooks/                # 60+ custom hooks for data fetching &amp; mutations
├── pages/                # Route-level page components
│   ├── admin/            # 15 admin dashboard pages
│   ├── moderator/        # 8 moderator management pages
│   └── tenant/           # 11 ISP tenant portal pages
├── integrations/
│   └── supabase/         # Auto-generated client &amp; types (DO NOT EDIT)
├── lib/                  # Utility functions
└── assets/               # Static images

supabase/
├── config.toml           # Edge function configuration (DO NOT EDIT)
├── functions/            # 20 Deno edge functions
│   ├── _shared/          # Shared email templates
│   └── ...
└── migrations/           # Auto-generated SQL migrations (DO NOT EDIT)</code></pre>

<h2>Authentication &amp; Registration Flow</h2>
<p>The registration process is a multi-step gated funnel:</p>
<ol>
<li><strong>ZIP Code Check</strong> — Validates service area via SmartyStreets API. If no ISP serves the ZIP → Access Request form. If bypass code provided → Skip to signup.</li>
<li><strong>Subscriber Verify</strong> — Matches user against ISP subscriber database via <code>validate-subscriber</code> edge function.</li>
<li><strong>Email Signup</strong> — Standard email/password registration via Supabase Auth. Triggers <code>handle_new_user()</code> → creates profile row. Email verification required.</li>
<li><strong>Discord OAuth</strong> — Mandatory Discord account linking before app access via <code>discord-oauth-callback</code> edge function.</li>
<li><strong>Dashboard</strong> — Full app access granted.</li>
</ol>

<h2>Role-Based Access Control (RBAC)</h2>
<h3>Platform Roles</h3>
<p>Stored in <code>user_roles</code> table using <code>app_role</code> enum. A user can hold multiple roles simultaneously.</p>
<table>
<thead><tr><th>Role</th><th>Enum Value</th><th>Access Scope</th></tr></thead>
<tbody>
<tr><td>Admin</td><td><code>admin</code></td><td>Full platform: users, games, seasons, settings, tenants, media, bypass codes, legacy users</td></tr>
<tr><td>Moderator</td><td><code>moderator</code></td><td>Tournament management, match scoring, point adjustments, challenges, ladders, prize redemptions</td></tr>
<tr><td>Marketing</td><td><code>marketing</code></td><td>Campaign creation, branded calendar publishing, marketing assets</td></tr>
<tr><td>Player</td><td><em>(default)</em></td><td>Tournaments, challenges, community, prize shop, leaderboard, achievements</td></tr>
</tbody></table>

<h3>Tenant Roles</h3>
<p>Stored in <code>tenant_admins</code> table with a text <code>role</code> field.</p>
<table>
<thead><tr><th>Role</th><th>Access</th></tr></thead>
<tbody>
<tr><td>Tenant Admin (<code>admin</code>)</td><td>Full ISP portal: events, subscribers, billing config, team management, ZIP codes</td></tr>
<tr><td>Tenant Marketing (<code>marketing</code>)</td><td>Marketing assets and branded calendars for their tenant</td></tr>
</tbody></table>

<h3>Server-Side Enforcement</h3>
<p>All RLS policies use <code>SECURITY DEFINER</code> helper functions to prevent recursive policy evaluation:</p>
<ul>
<li><code>has_role(user_id, role)</code> — Platform role check</li>
<li><code>is_tenant_member(tenant_id, user_id)</code> — Any tenant role</li>
<li><code>is_tenant_admin(tenant_id, user_id)</code> — Tenant admin only</li>
<li><code>is_tenant_marketing_member(tenant_id, user_id)</code> — Tenant admin or marketing</li>
</ul>

<h3>Client-Side Route Guards</h3>
<table>
<thead><tr><th>Component</th><th>File</th><th>Access Rule</th></tr></thead>
<tbody>
<tr><td><code>AdminRoute</code></td><td><code>src/components/admin/AdminRoute.tsx</code></td><td><code>isAdmin</code> only</td></tr>
<tr><td><code>ModeratorRoute</code></td><td><code>src/components/moderator/ModeratorRoute.tsx</code></td><td><code>isAdmin || isModerator</code></td></tr>
<tr><td><code>MarketingRoute</code></td><td><code>src/components/admin/MarketingRoute.tsx</code></td><td><code>isAdmin || isMarketing</code></td></tr>
<tr><td><code>TenantRoute</code></td><td><code>src/components/tenant/TenantRoute.tsx</code></td><td><code>tenant_admins</code> membership</td></tr>
<tr><td><code>ProtectedRoute</code></td><td><code>src/components/ProtectedRoute.tsx</code></td><td>Any authenticated user + Discord linked</td></tr>
</tbody></table>

<h2>Route Map</h2>
<h3>Public Routes</h3>
<table>
<thead><tr><th>Path</th><th>Page</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>/</code></td><td>Index</td><td>Landing page with hero, featured tournaments</td></tr>
<tr><td><code>/auth</code></td><td>Auth</td><td>Login / multi-step registration</td></tr>
<tr><td><code>/terms</code></td><td>Terms</td><td>Terms of Service</td></tr>
<tr><td><code>/privacy</code></td><td>PrivacyPolicy</td><td>Privacy Policy</td></tr>
<tr><td><code>/acceptable-use</code></td><td>AcceptableUsePolicy</td><td>Acceptable Use Policy</td></tr>
<tr><td><code>/disabled-users</code></td><td>DisabledUsersNotice</td><td>Disabled Users Notice</td></tr>
<tr><td><code>/reset-password</code></td><td>ResetPassword</td><td>Password reset flow</td></tr>
<tr><td><code>/events/:tenantSlug</code></td><td>TenantEventPage</td><td>Public tenant event listing</td></tr>
<tr><td><code>/events/:tenantSlug/:eventId</code></td><td>TenantEventDetail</td><td>Public event detail</td></tr>
<tr><td><code>/embed/calendar/:configId</code></td><td>EmbedCalendar</td><td>Embeddable tournament calendar</td></tr>
</tbody></table>

<h3>Authenticated Player Routes</h3>
<table>
<thead><tr><th>Path</th><th>Page</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>/dashboard</code></td><td>Dashboard</td><td>Player home with stats overview</td></tr>
<tr><td><code>/tournaments</code></td><td>Tournaments</td><td>Browse &amp; register for tournaments</td></tr>
<tr><td><code>/tournaments/:id</code></td><td>TournamentDetail</td><td>Tournament info, registration, schedule</td></tr>
<tr><td><code>/tournaments/:id/bracket</code></td><td>TournamentBracket</td><td>Interactive bracket visualization</td></tr>
<tr><td><code>/calendar</code></td><td>TournamentCalendar</td><td>Calendar view of upcoming tournaments</td></tr>
<tr><td><code>/community</code></td><td>Community</td><td>Forum: posts, replies, likes, pinning</td></tr>
<tr><td><code>/leaderboard</code></td><td>Leaderboard</td><td>Seasonal ranked leaderboard</td></tr>
<tr><td><code>/season-stats</code></td><td>SeasonStats</td><td>Detailed season statistics</td></tr>
<tr><td><code>/compare</code></td><td>PlayerComparison</td><td>Head-to-head player comparison</td></tr>
<tr><td><code>/achievements</code></td><td>Achievements</td><td>Achievement gallery with progress</td></tr>
<tr><td><code>/games</code></td><td>Games</td><td>Game catalog with categories</td></tr>
<tr><td><code>/games/:slug</code></td><td>GameDetail</td><td>Game detail with guides</td></tr>
<tr><td><code>/player/:id</code></td><td>PlayerProfile</td><td>Player profile: stats, achievements, history</td></tr>
<tr><td><code>/challenges</code></td><td>Challenges</td><td>Browse &amp; enroll in challenges</td></tr>
<tr><td><code>/challenges/:id</code></td><td>ChallengeDetail</td><td>Challenge detail, task checklist, evidence</td></tr>
<tr><td><code>/prize-shop</code></td><td>PrizeShop</td><td>Redeem points for prizes</td></tr>
<tr><td><code>/ladders</code></td><td>Ladders</td><td>Ranked ladder standings</td></tr>
<tr><td><code>/guide</code></td><td>PlayerGuide</td><td>Searchable player guide</td></tr>
<tr><td><code>/profile</code></td><td>ProfileSettings</td><td>Edit profile, avatar, gamer tag</td></tr>
<tr><td><code>/link-discord</code></td><td>LinkDiscord</td><td>Discord OAuth linking</td></tr>
</tbody></table>

<h3>Admin, Moderator &amp; Tenant Routes</h3>
<ul>
<li><strong>Admin</strong> (<code>/admin/*</code>): 15 pages — Dashboard, Users, Tournaments, Games, Media, Bypass Codes, Tenants, Settings, Notebooks, Seasons, Achievements, Guide, Marketing, Access Requests, Legacy Users.</li>
<li><strong>Moderator</strong> (<code>/moderator/*</code>): 8 pages — Dashboard, Tournaments, Matches, Points, Challenges, Ladders, Redemptions, Guide.</li>
<li><strong>Tenant</strong> (<code>/tenant/*</code>): 11 pages — Dashboard, Players, Leads, ZIP Codes, Subscribers, Team, Settings, Marketing, Marketing Assets, Marketing Detail, Events.</li>
</ul>

<h2>Key Features</h2>
<h3>Tournament System</h3>
<ul>
<li>Full CRUD with game selection, format, dates, prize pools</li>
<li>Bracket generation and round-by-round match scoring</li>
<li>Player registration with capacity enforcement</li>
<li>Email + in-app notifications at every lifecycle stage</li>
<li>Calendar view with embeddable widget for tenant co-branding</li>
</ul>

<h3>Challenge System (Work Orders)</h3>
<ul>
<li>Created by moderators with optional task checklists</li>
<li>Players enroll, complete tasks, upload evidence (images/videos)</li>
<li>Per-evidence moderator review with approve/reject + feedback notes</li>
<li>AI-enhanced challenge descriptions</li>
</ul>

<h3>Ranked Ladders</h3>
<ul>
<li>ELO-based rating system</li>
<li>Moderator-managed match results</li>
<li>Per-game ladder standings</li>
</ul>

<h3>Seasonal Leaderboard</h3>
<ul>
<li>Point accumulation across tournaments and challenges</li>
<li>Season rotation with snapshot archival</li>
<li>Point adjustments by moderators (bonus/penalty)</li>
</ul>

<h3>Achievement System</h3>
<ul>
<li>Admin-defined achievements with tiers (bronze/silver/gold/platinum)</li>
<li>Auto-criteria evaluation + manual award</li>
<li>Progress tracking with notifications on unlock</li>
</ul>

<h3>Prize Shop</h3>
<ul>
<li>Point-based redemptions with stock management</li>
<li>Moderator review workflow (pending → approved → fulfilled / denied)</li>
<li>Automatic point deduction and stock decrement via DB triggers</li>
</ul>

<h3>AI Coach</h3>
<ul>
<li>Game-specific coaching via floating chat panel</li>
<li>Conversation history persisted across sessions</li>
<li>Powered by Lovable AI (no external API key required)</li>
</ul>

<h3>Community Forum</h3>
<ul>
<li>Threaded posts with replies, likes, pinning</li>
<li>Category-based organization</li>
</ul>

<h3>Media Library</h3>
<ul>
<li>Upload images/videos to storage</li>
<li>AI image generation</li>
<li>Tagging, categories, inline editor with canvas tools</li>
</ul>

<h3>Player Profiles</h3>
<ul>
<li>Avatar upload, gamer tag, display name</li>
<li>Match history, achievement showcase</li>
<li>Head-to-head comparison, skill insights</li>
</ul>

<h2>Multi-Tenant (ISP) System</h2>
<table>
<thead><tr><th>Table</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><code>tenants</code></td><td>Org record: name, slug, logo, billing config, status</td></tr>
<tr><td><code>tenant_admins</code></td><td>User-role assignments scoped to tenant</td></tr>
<tr><td><code>tenant_subscribers</code></td><td>Synced subscriber list (NISC/GLDS/CSV)</td></tr>
<tr><td><code>tenant_events</code></td><td>Local tournaments and events</td></tr>
<tr><td><code>tenant_event_assets</code></td><td>Event promotional materials</td></tr>
<tr><td><code>tenant_event_registrations</code></td><td>Event registration tracking</td></tr>
<tr><td><code>tenant_integrations</code></td><td>Billing system API connections (NISC, GLDS)</td></tr>
<tr><td><code>tenant_zip_codes</code></td><td>Service area ZIP codes</td></tr>
<tr><td><code>tenant_marketing_assets</code></td><td>Co-branded marketing materials</td></tr>
</tbody></table>

<h3>Subscriber Sync</h3>
<ul>
<li><strong>NISC</strong>: <code>nisc-sync</code> edge function pulls from NISC API</li>
<li><strong>GLDS</strong>: <code>glds-sync</code> edge function pulls from GLDS API</li>
<li>Both sync to <code>tenant_subscribers</code> with deduplication via <code>external_id</code></li>
</ul>

<h2>Edge Functions</h2>
<table>
<thead><tr><th>Function</th><th>Purpose</th><th>Trigger</th></tr></thead>
<tbody>
<tr><td><code>ai-coach</code></td><td>AI game coaching responses</td><td>HTTP (client)</td></tr>
<tr><td><code>auth-email-hook</code></td><td>Custom branded email templates</td><td>Auth webhook</td></tr>
<tr><td><code>award-season-points</code></td><td>Award points for tournament placements</td><td>HTTP (moderator)</td></tr>
<tr><td><code>discord-oauth-callback</code></td><td>Handle Discord OAuth flow</td><td>HTTP (redirect)</td></tr>
<tr><td><code>ecosystem-magic-link</code></td><td>Cross-app SSO token generation</td><td>HTTP (client)</td></tr>
<tr><td><code>enhance-challenge-description</code></td><td>AI-enhance challenge descriptions</td><td>HTTP (moderator)</td></tr>
<tr><td><code>generate-media-image</code></td><td>AI image generation for media library</td><td>HTTP (admin)</td></tr>
<tr><td><code>glds-sync</code></td><td>Sync subscribers from GLDS billing</td><td>HTTP (tenant admin)</td></tr>
<tr><td><code>import-legacy-users</code></td><td>Bulk import legacy user records</td><td>HTTP (admin)</td></tr>
<tr><td><code>match-legacy-user</code></td><td>Match current user to legacy record</td><td>HTTP (client)</td></tr>
<tr><td><code>nisc-sync</code></td><td>Sync subscribers from NISC billing</td><td>HTTP (tenant admin)</td></tr>
<tr><td><code>notebook-proxy</code></td><td>Proxy requests to Open Notebook</td><td>HTTP (admin)</td></tr>
<tr><td><code>rotate-season</code></td><td>End season, snapshot, start new</td><td>HTTP (admin)</td></tr>
<tr><td><code>send-notification-email</code></td><td>Send templated notification emails</td><td>HTTP (DB trigger)</td></tr>
<tr><td><code>send-tournament-email</code></td><td>Send tournament-specific emails</td><td>HTTP (DB trigger)</td></tr>
<tr><td><code>tournament-reminders</code></td><td>Send upcoming tournament reminders</td><td>Cron / HTTP</td></tr>
<tr><td><code>validate-ecosystem-token</code></td><td>Validate cross-app magic link tokens</td><td>HTTP</td></tr>
<tr><td><code>validate-subscriber</code></td><td>Verify user is active ISP subscriber</td><td>HTTP</td></tr>
<tr><td><code>validate-zip</code></td><td>Validate ZIP code via SmartyStreets</td><td>HTTP</td></tr>
</tbody></table>

<h2>Database Architecture</h2>
<h3>Key Tables (40+ tables)</h3>
<table>
<thead><tr><th>Category</th><th>Tables</th></tr></thead>
<tbody>
<tr><td>Auth &amp; Profiles</td><td><code>profiles</code>, <code>user_roles</code>, <code>access_requests</code>, <code>bypass_codes</code></td></tr>
<tr><td>Tournaments</td><td><code>tournaments</code>, <code>tournament_registrations</code>, <code>match_results</code></td></tr>
<tr><td>Challenges</td><td><code>challenges</code>, <code>challenge_tasks</code>, <code>challenge_enrollments</code>, <code>challenge_evidence</code>, <code>challenge_completions</code></td></tr>
<tr><td>Seasons</td><td><code>seasons</code>, <code>season_scores</code>, <code>season_snapshots</code>, <code>point_adjustments</code></td></tr>
<tr><td>Achievements</td><td><code>achievement_definitions</code>, <code>player_achievements</code></td></tr>
<tr><td>Prizes</td><td><code>prizes</code>, <code>prize_redemptions</code></td></tr>
<tr><td>Ladders</td><td><code>ladders</code>, <code>ladder_entries</code></td></tr>
<tr><td>Community</td><td><code>community_posts</code>, <code>community_likes</code></td></tr>
<tr><td>AI Coach</td><td><code>coach_conversations</code>, <code>coach_messages</code></td></tr>
<tr><td>Notifications</td><td><code>notifications</code>, <code>notification_preferences</code></td></tr>
<tr><td>Games</td><td><code>games</code></td></tr>
<tr><td>Media</td><td><code>media_library</code></td></tr>
<tr><td>Tenant</td><td><code>tenants</code>, <code>tenant_admins</code>, <code>tenant_subscribers</code>, <code>tenant_events</code>, <code>tenant_integrations</code>, etc.</td></tr>
<tr><td>Marketing</td><td><code>marketing_campaigns</code>, <code>marketing_assets</code>, <code>calendar_publish_configs</code></td></tr>
<tr><td>Ecosystem</td><td><code>ecosystem_auth_tokens</code></td></tr>
<tr><td>Admin</td><td><code>app_settings</code>, <code>managed_pages</code>, <code>page_backgrounds</code>, <code>page_hero_images</code>, etc.</td></tr>
</tbody></table>

<h3>Conventions</h3>
<ul>
<li>All tables use <code>uuid</code> primary keys with <code>gen_random_uuid()</code> defaults</li>
<li>Timestamps use <code>timestamp with time zone</code> defaulting to <code>now()</code></li>
<li>Soft references to <code>auth.users</code> via <code>user_id uuid</code> (no FK to auth schema)</li>
<li>RLS enabled on all tables</li>
<li><code>SECURITY DEFINER</code> functions for cross-table role checks</li>
<li>Validation triggers preferred over CHECK constraints</li>
</ul>

<h3>Key Database Functions</h3>
<table>
<thead><tr><th>Function</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><code>has_role(user_id, role)</code></td><td>Check platform role (SECURITY DEFINER)</td></tr>
<tr><td><code>is_tenant_member(tenant_id, user_id)</code></td><td>Check any tenant membership</td></tr>
<tr><td><code>is_tenant_admin(tenant_id, user_id)</code></td><td>Check tenant admin role</td></tr>
<tr><td><code>should_notify(user_id, type, channel)</code></td><td>Check notification preferences</td></tr>
<tr><td><code>handle_new_user()</code></td><td>Create profile on signup (trigger)</td></tr>
<tr><td><code>validate_bypass_code(code)</code></td><td>Validate &amp; consume bypass codes</td></tr>
<tr><td><code>deduct_points_on_approval()</code></td><td>Deduct points when redemption approved</td></tr>
</tbody></table>

<h2>Storage Buckets</h2>
<table>
<thead><tr><th>Bucket</th><th>Public</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><code>avatars</code></td><td>Yes</td><td>User profile pictures</td></tr>
<tr><td><code>app-media</code></td><td>Yes</td><td>Challenge evidence, media library, marketing assets, event images</td></tr>
<tr><td><code>email-assets</code></td><td>Yes</td><td>Static assets for email templates</td></tr>
</tbody></table>

<h2>Notification System</h2>
<h3>Channels</h3>
<ol>
<li><strong>In-App</strong>: PostgreSQL triggers insert into <code>notifications</code> table. Client polls via React Query.</li>
<li><strong>Email</strong>: Triggers call <code>send-notification-email</code> edge function → Resend API with custom HTML templates.</li>
</ol>

<h3>Notification Types</h3>
<table>
<thead><tr><th>Type</th><th>In-App</th><th>Email</th><th>Triggered By</th></tr></thead>
<tbody>
<tr><td>Registration confirmed</td><td>✅</td><td>✅</td><td>Tournament registration</td></tr>
<tr><td>Tournament starting</td><td>✅</td><td>✅</td><td>Status → in_progress</td></tr>
<tr><td>Match completed</td><td>✅</td><td>✅</td><td>Match status → completed</td></tr>
<tr><td>New challenge</td><td>✅</td><td>✅</td><td>Challenge created active</td></tr>
<tr><td>Redemption update</td><td>✅</td><td>✅</td><td>Prize redemption status change</td></tr>
<tr><td>Achievement earned</td><td>✅</td><td>✅</td><td>Achievement awarded</td></tr>
<tr><td>Access request</td><td>✅</td><td>✅</td><td>New access request submitted</td></tr>
</tbody></table>

<h2>Environment Variables &amp; Secrets</h2>
<h3>Auto-Managed (<code>.env</code>)</h3>
<table>
<thead><tr><th>Variable</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><code>VITE_SUPABASE_URL</code></td><td>Backend API URL</td></tr>
<tr><td><code>VITE_SUPABASE_PUBLISHABLE_KEY</code></td><td>Public anon key</td></tr>
<tr><td><code>VITE_SUPABASE_PROJECT_ID</code></td><td>Project identifier</td></tr>
</tbody></table>

<h3>Edge Function Secrets</h3>
<table>
<thead><tr><th>Secret</th><th>Used By</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><code>RESEND_API_KEY</code></td><td>Email functions</td><td>Email delivery via Resend</td></tr>
<tr><td><code>DISCORD_CLIENT_ID</code></td><td>Discord OAuth</td><td>Discord OAuth app ID</td></tr>
<tr><td><code>DISCORD_CLIENT_SECRET</code></td><td>Discord OAuth</td><td>Discord OAuth app secret</td></tr>
<tr><td><code>DISCORD_BOT_TOKEN</code></td><td>Discord OAuth</td><td>Bot for role assignment</td></tr>
<tr><td><code>DISCORD_GUILD_ID</code></td><td>Discord OAuth</td><td>Target Discord server</td></tr>
<tr><td><code>DISCORD_VERIFIED_ROLE_ID</code></td><td>Discord OAuth</td><td>Role to assign on verification</td></tr>
<tr><td><code>SMARTY_AUTH_ID</code></td><td>validate-zip</td><td>SmartyStreets API auth</td></tr>
<tr><td><code>SMARTY_AUTH_TOKEN</code></td><td>validate-zip</td><td>SmartyStreets API token</td></tr>
<tr><td><code>LOVABLE_API_KEY</code></td><td>AI functions</td><td>Lovable AI features</td></tr>
<tr><td><code>SUPABASE_SERVICE_ROLE_KEY</code></td><td>Multiple</td><td>Service role for admin operations</td></tr>
</tbody></table>

<h2>Ecosystem Integration</h2>
<table>
<thead><tr><th>App</th><th>Domain</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td>FGN Play</td><td>play.fgn.gg</td><td>This app — gaming platform</td></tr>
<tr><td>FGN Manage</td><td>manage.fgn.gg</td><td>ISP subscriber verification portal</td></tr>
<tr><td>FGN Hub</td><td>hub.fgn.gg</td><td>Partner hub for creative assets</td></tr>
</tbody></table>
<p>Cross-app navigation uses magic link tokens generated by <code>ecosystem-magic-link</code> and validated by <code>validate-ecosystem-token</code>. Tokens expire after use.</p>

<h2>Local Development</h2>
<pre><code># Clone the repository
git clone &lt;YOUR_GIT_URL&gt;
cd &lt;YOUR_PROJECT_NAME&gt;

# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build</code></pre>

<h2>Deployment</h2>
<h3>Frontend</h3>
<p>Deploys via Lovable's <strong>Publish</strong> button.</p>
<h3>Backend</h3>
<p>Edge functions and database migrations deploy automatically on commit.</p>
<h3>DNS Configuration</h3>
<ul>
<li><strong>Domain</strong>: play.fgn.gg</li>
<li><strong>A Record</strong>: play → 185.158.133.1 (Lovable edge)</li>
</ul>

<h2>Legal Pages</h2>
<table>
<thead><tr><th>Path</th><th>Page</th></tr></thead>
<tbody>
<tr><td>/terms</td><td>Terms of Service</td></tr>
<tr><td>/privacy</td><td>Privacy Policy</td></tr>
<tr><td>/acceptable-use</td><td>Acceptable Use Policy</td></tr>
<tr><td>/disabled-users</td><td>Disabled Users Notice</td></tr>
</tbody></table>

<h2>Contributing</h2>
<h3>Code Conventions</h3>
<ul>
<li><strong>Pages</strong>: PascalCase, one per route</li>
<li><strong>Hooks</strong>: <code>use</code> prefix, camelCase</li>
<li><strong>Components</strong>: PascalCase, grouped by domain folder</li>
<li><strong>Edge Functions</strong>: kebab-case directory names</li>
</ul>

<h3>Architecture Decisions</h3>
<ul>
<li>All color values use HSL via CSS custom properties</li>
<li>Server state managed via TanStack React Query</li>
<li>Auth state in React Context — roles derived from array, not single value</li>
<li>RLS policies use SECURITY DEFINER helper functions</li>
<li>No direct foreign keys to <code>auth.users</code></li>
</ul>
`;
  openPrintWindow("FGN — README", body);
}

export function exportArchitecturePdf() {
  const body = `
<h1>FGN Platform Architecture</h1>
<blockquote>Comprehensive developer onboarding guide for the Fibre Gaming Network codebase.</blockquote>
<hr>

<h2>Overview</h2>
<p>FGN (Fibre Gaming Network) is a React SPA backed by Lovable Cloud (Supabase). It serves as a competitive gaming portal for ISP-sponsored communities, supporting multiple tenants (ISPs), each with their own subscriber bases, events, and marketing capabilities.</p>
<p><strong>Tech Stack</strong>: React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · TanStack React Query · React Router v6 · Supabase (Auth, PostgreSQL, Edge Functions, Storage, Realtime)</p>

<h2>Project Structure</h2>
<pre><code>src/
├── assets/               # Static images (game covers, hero backgrounds, logos)
├── components/           # Reusable UI components, grouped by domain
│   ├── admin/            # AdminLayout, AdminSidebar, AdminRoute, MarketingRoute
│   ├── auth/             # ZipCheckStep, SubscriberVerifyStep
│   ├── challenges/       # ChallengeCard, EvidenceUpload, TaskChecklist
│   ├── coach/            # CoachHistoryPanel
│   ├── community/        # CreateTopicDialog, TopicDetail
│   ├── compare/          # ComparisonChart, PlayerSelector, HeadToHeadHistory
│   ├── games/            # GameCard, AddGameDialog
│   ├── media/            # MediaGrid, MediaUploader, AIImageGenerator
│   ├── moderator/        # ModeratorLayout, ModeratorSidebar, ModeratorRoute
│   ├── player/           # PlayerProfileHeader, PlayerStatsGrid
│   ├── stats/            # GameStatsView, MyStatsView, SkillInsightsPanel
│   ├── tenant/           # TenantLayout, TenantSidebar, TenantRoute
│   ├── tournaments/      # TournamentCard, BracketMatchCard
│   └── ui/               # shadcn/ui primitives (50+ components)
├── contexts/
│   ├── AuthContext.tsx    # Session, multi-role state, Discord
│   └── CoachContext.tsx   # AI coach conversation state
├── hooks/                # 60+ custom hooks
├── integrations/
│   └── supabase/         # ⚠️ AUTO-GENERATED — DO NOT EDIT
├── lib/                  # Utility functions
├── pages/                # Route-level page components
│   ├── admin/            # 15 admin pages
│   ├── moderator/        # 8 moderator pages
│   └── tenant/           # 11 ISP tenant portal pages
└── main.tsx              # App entry point

supabase/
├── config.toml           # ⚠️ AUTO-MANAGED
├── functions/            # 20 Deno edge functions (auto-deployed)
│   ├── _shared/          # Shared email templates
│   └── &lt;function-name&gt;/  # Each function has index.ts
└── migrations/           # ⚠️ AUTO-GENERATED</code></pre>

<h3>Files You Must NOT Edit</h3>
<table>
<thead><tr><th>File</th><th>Reason</th></tr></thead>
<tbody>
<tr><td><code>src/integrations/supabase/client.ts</code></td><td>Auto-generated Supabase client</td></tr>
<tr><td><code>src/integrations/supabase/types.ts</code></td><td>Auto-generated TypeScript types</td></tr>
<tr><td><code>supabase/config.toml</code></td><td>Managed by Lovable Cloud</td></tr>
<tr><td><code>.env</code></td><td>Auto-populated with credentials</td></tr>
<tr><td><code>supabase/migrations/*</code></td><td>Generated by migration tool</td></tr>
</tbody></table>

<h2>Authentication &amp; Registration Flow</h2>
<h3>Registration Funnel (Multi-Step)</h3>
<pre><code>ZIP Code Input
    ↓ (validated via Smarty API — validate-zip edge function)
Provider Selection (if multiple ISPs in that ZIP)
    ↓
Subscriber Verification (optional per-tenant toggle)
    ↓ (validate-subscriber edge function)
Email + Password Signup
    ↓ (Supabase Auth → handle_new_user trigger → profile)
Email Verification
    ↓
Discord OAuth Linking (mandatory gate via /link-discord)
    ↓ (discord-oauth-callback edge function)
Dashboard Access</code></pre>

<h3>Bypass Path (No ISP Coverage)</h3>
<ul>
<li>Enter a <strong>bypass code</strong> (validated via <code>validate_bypass_code()</code> DB function)</li>
<li>Submit an <strong>Access Request</strong> for manual admin review — approved requests auto-generate single-use bypass codes (prefixed <code>AR-</code>)</li>
</ul>

<h3>Session Management</h3>
<ul>
<li>Supabase Auth manages JWT sessions</li>
<li><code>AuthContext</code> listens to <code>onAuthStateChange</code> and fetches roles + Discord status</li>
<li><code>ProtectedRoute</code> enforces authentication + Discord linking</li>
</ul>

<h2>RBAC Implementation</h2>
<h3>Platform Roles</h3>
<p>Stored in <code>user_roles</code> table using <code>app_role</code> enum: <code>admin</code>, <code>moderator</code>, <code>marketing</code>, <code>user</code>.</p>
<p><strong>Critical design</strong>: A user can hold <strong>multiple concurrent roles</strong>. <code>AuthContext</code> fetches all roles and derives boolean flags:</p>
<pre><code>const roles = (roleResult.data ?? []).map((r) =&gt; r.role);
setIsAdmin(roles.includes("admin"));
setIsModerator(roles.includes("moderator"));
setIsMarketing(roles.includes("marketing"));</code></pre>

<h3>Tenant Roles</h3>
<p>Stored in <code>tenant_admins</code> table with text <code>role</code> field: <code>admin</code>, <code>manager</code>, <code>marketing</code>.</p>

<h3>Server-Side Enforcement (RLS)</h3>
<table>
<thead><tr><th>Function</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><code>has_role(user_id, role)</code></td><td>Check platform role</td></tr>
<tr><td><code>is_tenant_member(tenant_id, user_id)</code></td><td>Any tenant role membership</td></tr>
<tr><td><code>is_tenant_admin(tenant_id, user_id)</code></td><td>Tenant admin only</td></tr>
<tr><td><code>is_tenant_marketing_member(tenant_id, user_id)</code></td><td>Tenant admin or marketing</td></tr>
<tr><td><code>should_notify(user_id, type, channel)</code></td><td>Check notification opt-in</td></tr>
<tr><td><code>validate_bypass_code(code)</code></td><td>Validate + increment bypass code</td></tr>
<tr><td><code>lookup_providers_by_zip(zip)</code></td><td>Find ISPs serving a ZIP code</td></tr>
</tbody></table>

<h3>Client-Side Route Guards</h3>
<table>
<thead><tr><th>Component</th><th>Access Rule</th></tr></thead>
<tbody>
<tr><td><code>AdminRoute</code></td><td><code>isAdmin === true</code></td></tr>
<tr><td><code>ModeratorRoute</code></td><td><code>isAdmin || isModerator</code></td></tr>
<tr><td><code>MarketingRoute</code></td><td><code>isAdmin || isMarketing</code></td></tr>
<tr><td><code>TenantRoute</code></td><td>Checks <code>tenant_admins</code> membership</td></tr>
<tr><td><code>ProtectedRoute</code></td><td>Authenticated + Discord linked</td></tr>
</tbody></table>

<h2>Route Architecture</h2>
<h3>Public Routes (No Auth)</h3>
<table>
<thead><tr><th>Path</th><th>Page</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>/</code></td><td>Index</td><td>Landing page</td></tr>
<tr><td><code>/auth</code></td><td>Auth</td><td>Login/register with multi-step onboarding</td></tr>
<tr><td><code>/terms</code></td><td>Terms</td><td>Terms of Service</td></tr>
<tr><td><code>/privacy</code></td><td>PrivacyPolicy</td><td>Privacy Policy</td></tr>
<tr><td><code>/events/:tenantSlug</code></td><td>TenantEventPage</td><td>Public tenant event listing</td></tr>
<tr><td><code>/embed/calendar/:configId</code></td><td>EmbedCalendar</td><td>Embeddable calendar (iframe)</td></tr>
</tbody></table>

<h3>Player Routes (Auth + Discord Required)</h3>
<table>
<thead><tr><th>Path</th><th>Page</th></tr></thead>
<tbody>
<tr><td><code>/dashboard</code></td><td>Dashboard</td></tr>
<tr><td><code>/tournaments</code></td><td>Tournament list</td></tr>
<tr><td><code>/tournaments/:id</code></td><td>Tournament detail + registration</td></tr>
<tr><td><code>/tournaments/:id/bracket</code></td><td>Live bracket view</td></tr>
<tr><td><code>/calendar</code></td><td>Tournament calendar</td></tr>
<tr><td><code>/community</code></td><td>Community forum</td></tr>
<tr><td><code>/leaderboard</code></td><td>Seasonal leaderboard</td></tr>
<tr><td><code>/compare</code></td><td>Head-to-head comparison</td></tr>
<tr><td><code>/achievements</code></td><td>Achievement gallery</td></tr>
<tr><td><code>/games</code></td><td>Game library</td></tr>
<tr><td><code>/challenges</code></td><td>Challenge list</td></tr>
<tr><td><code>/prize-shop</code></td><td>Prize redemption shop</td></tr>
<tr><td><code>/ladders</code></td><td>Ranked ladders</td></tr>
<tr><td><code>/profile</code></td><td>Profile settings</td></tr>
</tbody></table>

<h3>Admin, Moderator &amp; Tenant Routes</h3>
<ul>
<li><strong>Admin</strong> (<code>/admin/*</code>): 15 pages</li>
<li><strong>Moderator</strong> (<code>/moderator/*</code>): 8 pages</li>
<li><strong>Tenant</strong> (<code>/tenant/*</code>): 11 pages</li>
</ul>

<h2>Multi-Tenant (ISP) System</h2>
<h3>Core Tables</h3>
<table>
<thead><tr><th>Table</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><code>tenants</code></td><td>Organization record: name, slug, logo, brand colors, billing config</td></tr>
<tr><td><code>tenant_admins</code></td><td>User-role assignments scoped to tenant</td></tr>
<tr><td><code>tenant_subscribers</code></td><td>Synced subscriber list</td></tr>
<tr><td><code>tenant_zip_codes</code></td><td>Service area ZIP codes</td></tr>
<tr><td><code>tenant_events</code></td><td>Local tournaments/events</td></tr>
<tr><td><code>tenant_event_assets</code></td><td>Promotional images</td></tr>
<tr><td><code>tenant_integrations</code></td><td>Billing system API connections</td></tr>
<tr><td><code>tenant_sync_logs</code></td><td>Audit log for subscriber sync</td></tr>
<tr><td><code>tenant_marketing_assets</code></td><td>Co-branded marketing materials</td></tr>
</tbody></table>

<h3>Subscriber Sync Pipeline</h3>
<pre><code>Billing System (NISC/GLDS) → Edge Function → tenant_subscribers table
                                   ↓
                          tenant_sync_logs (audit)</code></pre>
<ul>
<li><strong>NISC</strong>: <code>nisc-sync</code> edge function</li>
<li><strong>GLDS</strong>: <code>glds-sync</code> edge function</li>
<li>Both deduplicate via <code>external_id</code></li>
<li>CSV upload supported as manual alternative</li>
</ul>

<h3>Service Lead Generation</h3>
<p>When a user registers through a tenant's ZIP code, a <code>user_service_interests</code> record is created linking the user to that tenant.</p>

<h2>Tournament Lifecycle</h2>
<pre><code>Created (draft)
    ↓ (status: 'upcoming')
Registration Open (status: 'open')
    ↓ (players register; capacity enforced)
In Progress (status: 'in_progress')
    ↓ (bracket generated; matches scored round-by-round)
    ↓ (notifications sent at each stage)
Completed (status: 'completed')
    ↓ (award-season-points edge function updates season_scores)</code></pre>

<h3>Prize System</h3>
<ul>
<li><strong>Points</strong>: Season points awarded by placement (1st/2nd/3rd/participation)</li>
<li><strong>Prize Pool</strong>: Cash/value pool split by percentage</li>
<li><strong>Catalog Prize</strong>: Link to a prize from the <code>prizes</code> table</li>
</ul>

<h2>Challenge / Work Order System</h2>
<h3>Lifecycle</h3>
<ol>
<li><strong>Created</strong> by moderator — with optional task checklist, difficulty level, point values, date range</li>
<li><strong>Enrolled</strong> by player — creates <code>challenge_enrollments</code> record</li>
<li><strong>Evidence uploaded</strong> per-task — images/videos to storage, metadata in <code>challenge_evidence</code></li>
<li><strong>Per-evidence review</strong> — Moderators approve/reject with feedback notes</li>
<li><strong>Completion</strong> — When all required evidence is approved, player earns points</li>
</ol>

<h2>Seasonal Points &amp; Leaderboard</h2>
<table>
<thead><tr><th>Table</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><code>seasons</code></td><td>Season definitions with date ranges and status</td></tr>
<tr><td><code>season_scores</code></td><td>Per-user per-season: points, wins, losses, tournaments</td></tr>
<tr><td><code>season_snapshots</code></td><td>Frozen final standings archived at rotation</td></tr>
<tr><td><code>point_adjustments</code></td><td>Manual point modifications with reason + audit</td></tr>
</tbody></table>

<h3>Point Sources</h3>
<ul>
<li>Tournament placements — via <code>award-season-points</code></li>
<li>Challenge completions — via <code>challenge_completions</code></li>
<li>Manual adjustments — via moderator <code>point_adjustments</code></li>
</ul>

<h3>Spendable Points</h3>
<p><code>points_available</code> tracks spendable balance separately from total <code>points</code>. Prize redemptions deduct via the <code>deduct_points_on_approval()</code> trigger.</p>

<h2>AI Coach</h2>
<h3>Architecture (RAG)</h3>
<pre><code>User Message + Game Context
    ↓
ai-coach edge function
    ↓ (concurrent multi-source search)
    ├── Open Notebook connections (external knowledge bases)
    └── Local markdown guides (from games.guide_content)
    ↓
Context aggregation with source attribution
    ↓
google/gemini-3-flash-preview (via Lovable AI Gateway)
    ↓
Streamed response with citations</code></pre>

<h3>Persistence</h3>
<ul>
<li><code>coach_conversations</code> — conversation metadata (title, game_id, user_id)</li>
<li><code>coach_messages</code> — individual messages (content, role, conversation_id)</li>
<li>Session resumption across devices</li>
</ul>

<h2>Notification System</h2>
<h3>Dual-Channel Architecture</h3>
<table>
<thead><tr><th>Channel</th><th>Mechanism</th><th>Delivery</th></tr></thead>
<tbody>
<tr><td>In-App</td><td>PostgreSQL triggers → <code>notifications</code> table</td><td>Client polls via React Query</td></tr>
<tr><td>Email</td><td>PostgreSQL triggers → edge function → Resend API</td><td>HTML templates</td></tr>
</tbody></table>

<h3>Notification Types &amp; Triggers</h3>
<table>
<thead><tr><th>Event</th><th>In-App</th><th>Email</th></tr></thead>
<tbody>
<tr><td>Tournament starting</td><td>✅</td><td>✅</td></tr>
<tr><td>Registration confirmed</td><td>✅</td><td>✅</td></tr>
<tr><td>Match completed</td><td>✅</td><td>✅</td></tr>
<tr><td>Achievement earned</td><td>✅</td><td>✅</td></tr>
<tr><td>New challenge published</td><td>✅</td><td>✅</td></tr>
<tr><td>Prize redemption status</td><td>✅</td><td>✅</td></tr>
<tr><td>New access request</td><td>✅</td><td>✅</td></tr>
</tbody></table>

<h3>User Preferences</h3>
<p><code>notification_preferences</code> stores per-user, per-type opt-in/opt-out. The <code>should_notify()</code> function checks before sending. Defaults to true if no preference row exists.</p>

<h2>Edge Functions Inventory</h2>
<table>
<thead><tr><th>Function</th><th>Trigger</th><th>Purpose</th><th>Key Secrets</th></tr></thead>
<tbody>
<tr><td><code>ai-coach</code></td><td>HTTP POST</td><td>AI coaching with RAG context</td><td><code>LOVABLE_API_KEY</code></td></tr>
<tr><td><code>auth-email-hook</code></td><td>Auth hook</td><td>Custom email templates</td><td>—</td></tr>
<tr><td><code>award-season-points</code></td><td>HTTP POST</td><td>Award tournament points</td><td><code>SERVICE_ROLE_KEY</code></td></tr>
<tr><td><code>discord-oauth-callback</code></td><td>HTTP GET</td><td>Discord OAuth redirect</td><td><code>DISCORD_*</code></td></tr>
<tr><td><code>ecosystem-magic-link</code></td><td>HTTP POST</td><td>Cross-app SSO tokens</td><td><code>SERVICE_ROLE_KEY</code></td></tr>
<tr><td><code>enhance-challenge-description</code></td><td>HTTP POST</td><td>AI-enhance challenges</td><td><code>LOVABLE_API_KEY</code></td></tr>
<tr><td><code>generate-media-image</code></td><td>HTTP POST</td><td>AI image generation</td><td><code>LOVABLE_API_KEY</code></td></tr>
<tr><td><code>glds-sync</code></td><td>HTTP POST</td><td>Sync from GLDS billing</td><td><code>SERVICE_ROLE_KEY</code></td></tr>
<tr><td><code>import-legacy-users</code></td><td>HTTP POST</td><td>Bulk import legacy users</td><td><code>SERVICE_ROLE_KEY</code></td></tr>
<tr><td><code>match-legacy-user</code></td><td>HTTP POST</td><td>Match to legacy account</td><td><code>SERVICE_ROLE_KEY</code></td></tr>
<tr><td><code>nisc-sync</code></td><td>HTTP POST</td><td>Sync from NISC billing</td><td><code>SERVICE_ROLE_KEY</code></td></tr>
<tr><td><code>notebook-proxy</code></td><td>HTTP POST</td><td>Proxy to Open Notebook</td><td><code>OPEN_NOTEBOOK_*</code></td></tr>
<tr><td><code>rotate-season</code></td><td>HTTP POST</td><td>Snapshot + rotate season</td><td><code>SERVICE_ROLE_KEY</code></td></tr>
<tr><td><code>send-notification-email</code></td><td>HTTP POST</td><td>Send emails via Resend</td><td><code>RESEND_API_KEY</code></td></tr>
<tr><td><code>send-tournament-email</code></td><td>HTTP POST</td><td>Tournament emails</td><td><code>RESEND_API_KEY</code></td></tr>
<tr><td><code>tournament-reminders</code></td><td>HTTP/Cron</td><td>Upcoming tournament reminders</td><td><code>RESEND_API_KEY</code></td></tr>
<tr><td><code>validate-ecosystem-token</code></td><td>HTTP POST</td><td>Validate SSO tokens</td><td><code>SERVICE_ROLE_KEY</code></td></tr>
<tr><td><code>validate-subscriber</code></td><td>HTTP POST</td><td>Verify ISP subscriber</td><td><code>SERVICE_ROLE_KEY</code></td></tr>
<tr><td><code>validate-zip</code></td><td>HTTP POST</td><td>Validate ZIP via Smarty</td><td><code>SMARTY_*</code></td></tr>
</tbody></table>

<h2>Database Design</h2>
<h3>Key Conventions</h3>
<ul>
<li>All tables use <code>uuid</code> primary keys with <code>gen_random_uuid()</code></li>
<li>Timestamps use <code>timestamptz</code> defaulting to <code>now()</code></li>
<li>Soft references to <code>auth.users</code> via <code>user_id uuid</code> (no FK to auth schema)</li>
<li>RLS enabled on all tables</li>
<li><code>SECURITY DEFINER</code> functions for cross-table role checks</li>
<li>Validation triggers preferred over CHECK constraints</li>
<li><code>update_updated_at_column()</code> trigger on tables with <code>updated_at</code></li>
</ul>

<h3>Table Groups (40+ tables)</h3>
<ul>
<li><strong>Auth &amp; Access</strong>: <code>profiles</code>, <code>user_roles</code>, <code>access_requests</code>, <code>bypass_codes</code>, <code>ecosystem_auth_tokens</code></li>
<li><strong>Tournaments &amp; Matches</strong>: <code>tournaments</code>, <code>tournament_registrations</code>, <code>match_results</code></li>
<li><strong>Challenges</strong>: <code>challenges</code>, <code>challenge_tasks</code>, <code>challenge_enrollments</code>, <code>challenge_evidence</code>, <code>challenge_completions</code></li>
<li><strong>Seasons &amp; Points</strong>: <code>seasons</code>, <code>season_scores</code>, <code>season_snapshots</code>, <code>point_adjustments</code></li>
<li><strong>Community</strong>: <code>community_posts</code>, <code>community_likes</code></li>
<li><strong>Achievements</strong>: <code>achievement_definitions</code>, <code>player_achievements</code></li>
<li><strong>Prizes</strong>: <code>prizes</code>, <code>prize_redemptions</code></li>
<li><strong>Games &amp; Ladders</strong>: <code>games</code>, <code>ladders</code>, <code>ladder_entries</code></li>
<li><strong>AI Coach</strong>: <code>coach_conversations</code>, <code>coach_messages</code></li>
<li><strong>Multi-Tenant</strong>: <code>tenants</code>, <code>tenant_admins</code>, <code>tenant_subscribers</code>, <code>tenant_zip_codes</code>, <code>tenant_events</code>, <code>tenant_event_assets</code>, <code>tenant_integrations</code>, <code>tenant_sync_logs</code>, <code>tenant_marketing_assets</code></li>
<li><strong>Notifications</strong>: <code>notifications</code>, <code>notification_preferences</code></li>
<li><strong>Media &amp; Marketing</strong>: <code>media_library</code>, <code>marketing_campaigns</code>, <code>marketing_assets</code></li>
<li><strong>Configuration</strong>: <code>app_settings</code>, <code>managed_pages</code>, <code>page_backgrounds</code>, <code>page_hero_images</code>, <code>calendar_publish_configs</code></li>
</ul>

<h3>Key DB Triggers</h3>
<table>
<thead><tr><th>Trigger Function</th><th>Fires On</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><code>handle_new_user()</code></td><td><code>auth.users</code> INSERT</td><td>Creates profile row</td></tr>
<tr><td><code>deduct_points_on_approval()</code></td><td><code>prize_redemptions</code> UPDATE</td><td>Deducts spendable points</td></tr>
<tr><td><code>decrement_prize_stock()</code></td><td><code>prize_redemptions</code> UPDATE</td><td>Reduces prize quantity</td></tr>
<tr><td><code>update_updated_at_column()</code></td><td>Various UPDATE</td><td>Maintains timestamps</td></tr>
<tr><td><code>notify_*()</code> / <code>email_*()</code></td><td>Various</td><td>Dual-channel notification dispatch</td></tr>
</tbody></table>

<h2>Storage Buckets</h2>
<table>
<thead><tr><th>Bucket</th><th>Public</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><code>avatars</code></td><td>Yes</td><td>User profile pictures</td></tr>
<tr><td><code>app-media</code></td><td>Yes</td><td>Challenge evidence, media library, marketing, tournaments</td></tr>
<tr><td><code>email-assets</code></td><td>Yes</td><td>Static assets for email templates</td></tr>
</tbody></table>

<h2>Ecosystem Integration</h2>
<table>
<thead><tr><th>App</th><th>URL</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td>FGN Play</td><td>play.fgn.gg</td><td>Gaming platform (this app)</td></tr>
<tr><td>FGN Manage</td><td>manage.fgn.gg</td><td>ISP subscriber verification portal</td></tr>
<tr><td>FGN Hub</td><td>hub.fgn.gg</td><td>Partner hub for creative assets &amp; marketing</td></tr>
</tbody></table>

<h3>Cross-App SSO</h3>
<ol>
<li><code>ecosystem-magic-link</code> generates a short-lived token stored in <code>ecosystem_auth_tokens</code></li>
<li>Target app calls <code>validate-ecosystem-token</code> to verify and auto-sign-in</li>
</ol>

<h2>Error Handling &amp; Resilience</h2>
<h3>Global Error Boundary</h3>
<p>App wrapped in React <code>ErrorBoundary</code> in <code>main.tsx</code>. Unhandled render errors display a recovery UI.</p>

<h3>Data Fetching</h3>
<ul>
<li>TanStack React Query with automatic retry (3 attempts)</li>
<li>Cache invalidation on mutations via <code>queryClient.invalidateQueries()</code></li>
<li>Toast notifications for success/error feedback</li>
</ul>

<h2>Design System &amp; Theming</h2>
<h3>Architecture</h3>
<ul>
<li>Design tokens as CSS custom properties in <code>src/index.css</code> (HSL format)</li>
<li>Tailwind config maps tokens to utility classes</li>
<li>shadcn/ui components use semantic token classes</li>
<li>Dark/Light mode via <code>next-themes</code> class strategy</li>
</ul>

<h3>Key Tokens</h3>
<pre><code>--background, --foreground          # Base surface + text
--primary, --primary-foreground     # Brand action color
--secondary, --secondary-foreground # Secondary surfaces
--muted, --muted-foreground         # Subdued elements
--accent, --accent-foreground       # Highlights
--destructive                       # Error/danger states
--card, --card-foreground           # Card surfaces
--sidebar-*                         # Sidebar-specific tokens</code></pre>

<h3>Rule: Never Use Raw Colors in Components</h3>
<p>Always use semantic Tailwind classes (<code>bg-primary</code>, <code>text-foreground</code>) rather than raw values (<code>bg-blue-500</code>). All colors must flow through the design token system.</p>

<h2>Naming Conventions</h2>
<table>
<thead><tr><th>Entity</th><th>Convention</th><th>Example</th></tr></thead>
<tbody>
<tr><td>Pages</td><td>PascalCase, one per route</td><td><code>TournamentBracket.tsx</code></td></tr>
<tr><td>Hooks</td><td><code>use</code> prefix, camelCase</td><td><code>useChallengeEnrollment.ts</code></td></tr>
<tr><td>Components</td><td>PascalCase, domain folder</td><td><code>tournaments/BracketMatchCard.tsx</code></td></tr>
<tr><td>Edge Functions</td><td>kebab-case directory</td><td><code>award-season-points/</code></td></tr>
<tr><td>DB Tables</td><td>snake_case, plural</td><td><code>tournament_registrations</code></td></tr>
<tr><td>DB Functions</td><td>snake_case, verb-led</td><td><code>deduct_points_on_approval()</code></td></tr>
<tr><td>Contexts</td><td>PascalCase + <code>Context</code></td><td><code>AuthContext.tsx</code></td></tr>
</tbody></table>

<h2>Key Patterns &amp; Anti-Patterns</h2>
<h3>✅ Do</h3>
<ul>
<li>Use <code>SECURITY DEFINER</code> functions for cross-table RLS checks</li>
<li>Fetch all user roles as an array (not <code>.maybeSingle()</code>)</li>
<li>Apply layout wrappers at route level, not inside pages</li>
<li>Use React Query for all server-state; Context only for auth &amp; coach</li>
<li>Validate ZIP codes server-side via edge function</li>
<li>Use <code>should_notify()</code> before every notification trigger</li>
</ul>

<h3>❌ Don't</h3>
<ul>
<li>Add FK constraints to <code>auth.users</code> or modify reserved schemas</li>
<li>Edit auto-generated files (<code>client.ts</code>, <code>types.ts</code>, <code>config.toml</code>, <code>.env</code>, migrations)</li>
<li>Store roles on the <code>profiles</code> table (use <code>user_roles</code> only)</li>
<li>Use <code>as any</code> type casts — use proper generated types</li>
<li>Check admin status via <code>localStorage</code> or hardcoded credentials</li>
<li>Create CHECK constraints with <code>now()</code> — use validation triggers</li>
</ul>
`;
  openPrintWindow("FGN — Architecture Guide", body);
}
