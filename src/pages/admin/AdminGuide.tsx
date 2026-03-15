import { useState, useMemo, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  Trophy,
  Users,
  Award,
  Building2,
  Shield,
  Settings,
  Gamepad2,
  Calendar,
  Image,
  KeyRound,
  BookOpen,
  BrainCircuit,
  BarChart3,
  Search,
  Printer,
  ArrowUp,
  Plug,
  Database,
  ExternalLink,
  UserPlus,
  Target,
  Gift,
  Swords,
  Bell,
  Megaphone,
  CalendarDays,
  CalendarClock,
  Share2,
  Moon,
  Scale,
  Activity,
  Radar,
  Sparkles,
  FileText,
  ClipboardList,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
const sectionData: { id: string; icon: typeof Shield; title: string; bullets: string[] }[] = [
  {
    id: "overview",
    icon: Shield,
    title: "Admin vs Manager Roles",
    bullets: [
      "Super Admin / Admin — Full access to the Admin Dashboard, all settings, user management, tournament control, badge awarding, tenant configuration, and ecosystem tools.",
      "Marketing — Access to Admin → Marketing Dashboard (campaigns, calendar embeds, and web pages) and creative asset management. Can also view the Tenant sidebar's 'My Assets' library.",
      "Tenant Admin — Full access within their specific Tenant portal including subscribers, ZIP codes, integrations, events, marketing assets, tenant codes, web pages, and team management.",
      "Tenant Manager — Scoped access within a Tenant portal. Managers can view leads, events, marketing assets, and the tenant dashboard but cannot manage ZIP codes, subscribers, integrations, codes, or team settings.",
      "Tenant Marketing — Scoped access to tenant events, marketing assets, web pages, and read-only visibility of tenant codes.",
      "Moderator — Elevated privileges for community moderation, challenge management, prize/redemption review, ladder management, and point adjustments.",
      "Roles are assigned via the Admin → Users dashboard or Tenant → Team page. A user can hold both an app-level role and a tenant role simultaneously.",
    ],
  },
  {
    id: "user-management",
    icon: Users,
    title: "User Management",
    bullets: [
      "Navigate to Admin → Users to manage platform accounts.",
      "View all users — Browse registered accounts with display name, email, gamer tag, and role.",
      "Assign roles — Promote a user to Admin or Moderator, or revoke elevated access.",
      "Search — Filter by name, email, or gamer tag to locate specific accounts.",
      "Profiles — Each user has a profile with display name, gamer tag, avatar, and ZIP code. Profiles are created automatically on sign-up.",
      "Tip: Only Super Admins can promote other users to Admin.",
    ],
  },
  {
    id: "access-requests",
    icon: ClipboardList,
    title: "Access Requests",
    bullets: [
      "Navigate to Admin → Access Requests to review registration requests from users whose ZIP codes did not match any tenant service area.",
      "Review Queue — Each request shows the user's email, display name, ZIP code, submission date, and current status (Pending, Approved, Denied).",
      "Approve — Approve a request to grant the user platform access. Add optional admin notes explaining the decision.",
      "Deny — Deny a request if the user is outside your coverage area. Admin notes are preserved for audit.",
      "Filtering — Filter requests by status to focus on pending reviews or audit past decisions.",
    ],
  },
  {
    id: "tournament-management",
    icon: Trophy,
    title: "Tournament Management",
    bullets: [
      "Full control over the tournament lifecycle from Admin → Tournaments.",
      "Creating — Set name, game, format, date/time, max participants, description, rules, prize pool, entry fee, and hero image. Hero images can be uploaded or selected from the Media Library.",
      "Multi-Date Scheduling — Create multiple tournament instances from a single dialog using the multi-date calendar picker. Each date generates a separate tournament with an auto-appended date suffix.",
      "Prize Modes — Choose between 'None', 'Physical Prize' (linked to a Prize Shop item), or 'Value' (configurable percentage split, default 50/30/20, must sum to 100%).",
      "Status flow — Upcoming → Open (registration) → In Progress → Completed (or Cancelled at any point).",
      "View Modes — Toggle between List and Grid views. Your preference is persisted via URL history.",
      "Managing Registrations — View registered players, approve/remove registrations.",
      "Bracket & Scoring — Generate single-elimination bracket, enter match scores, winners advance automatically.",
      "Reset Bracket — Before any matches are completed, tournament creators can reset the bracket to delete all match data and return the tournament to Open status. This allows adding/removing players and regenerating the bracket. A confirmation dialog prevents accidental resets.",
      "Season Points — Points are awarded automatically when a tournament is completed based on placement.",
      "Calendar View — All tournaments appear on the /calendar monthly calendar, clickable for quick navigation to detail pages.",
      "Editing — Update any field including dates, rules, and hero images after creation via the Edit dialog.",
      "Deep Linking — Each tournament has a dedicated detail page at /tournaments/:id for sharing.",
    ],
  },
  {
    id: "badge-awarding",
    icon: Award,
    title: "Badge & Achievement System",
    bullets: [
      "Manage achievements from Admin → Achievements.",
      "Creating Badges — Define name, description, icon, category, tier (Bronze/Silver/Gold/Platinum), optional auto-criteria, and display order.",
      "Visual Icon Picker — Choose from 15+ Lucide icons (trophy, flame, star, crown, target, shield, swords, zap, medal, award, sparkles, heart, gem, bolt, rocket) with live icon previews in the selector dropdown.",
      "Auto-Criteria Types — wins, streak, matches, win_rate, tournament_champion, multi_tournament, iron_will — these are evaluated automatically when a player views their profile.",
      "Manual Awarding — Award any badge from the achievements admin page with optional notes. Use the bulk-assignment tool for awarding to multiple players.",
      "Quick Create — Define and award a badge in one step using the Quick Create flow.",
      "Special Recognition — Custom 'Special Recognition' badges are visually distinguished with purple styling and sparkling icons on player profiles.",
      "Moderator Access — Moderators also have full achievement management (create, edit, delete, award, revoke) from the Moderator → Achievements page.",
      "Unified Icons — All achievement icons render as actual Lucide SVG icons everywhere on the platform (profiles, pickers, admin/moderator panels) instead of text labels.",
      "Safety — A confirmation dialog prevents accidental awards.",
      "Leaderboard Sync — Milestone achievements are automatically persisted when players view their profile, keeping the global achievements leaderboard accurate.",
      "Tip: Use tiers for progression paths — e.g. 'Tournament Veteran' at Bronze (5), Silver (15), Gold (50), Platinum (100).",
    ],
  },
  {
    id: "tenant-config",
    icon: Building2,
    title: "Tenant Configuration",
    bullets: [
      "Tenants represent Broadband Service Providers. Manage from Admin → Tenants.",
      "Creating — Set name, slug, contact email, optional logo. Tenants start active.",
      "Assigning Admins — Add users as Tenant Admins (full access) or Managers (leads & dashboards only).",
      "ZIP Code Coverage — Each tenant manages ZIP codes for their service area; player ZIP codes are matched during registration to determine eligible providers.",
      "Status Management — Tenants can be toggled active/inactive. Inactive tenants are visually distinguished with reduced opacity and dashed borders at the bottom of the list.",
      "Sorting — The tenant list defaults to alphabetical sorting by name, with additional options for Created Date and Status.",
      "Email Invitations — Invite new tenant staff by email before they've registered an account. Invitations are automatically claimed when the invited user signs up.",
      "Subscriber Validation Toggle — Optionally require subscriber identity validation during registration, where users must verify their name and account number against the tenant's subscriber registry.",
      "Real-Time Counts — Tenant cards display live ZIP code counts and provide a 'Manage' button for direct portal navigation.",
    ],
  },
  {
    id: "tenant-portal",
    icon: BarChart3,
    title: "Tenant Portal",
    bullets: [
      "Access the Tenant Dashboard from the main sidebar (visible to Tenant Admins and Managers).",
      "Dashboard — Overview with stats grid showing Total Players, Subscribers, New Leads, and ZIP Codes Covered at a glance.",
      "Leads — View and manage user service interests. Update lead status (new → contacted → converted).",
      "ZIP Codes (Admin only) — Add or remove ZIP codes defining the tenant's service area.",
      "Subscribers (Admin only) — View/manage subscriber records with search and pagination (25 per page).",
      "Integrations (Admin only) — Configure billing system connections (NISC, GLDS) directly from the sidebar. See the Billing Integrations section for details.",
      "Team (Admin only) — Invite managers via display name search or email, update roles, remove team members.",
      "Tenant Codes — Manage campaign, override, access, tracking, and verification codes scoped to the tenant. Access codes grant immediate platform entry; override and verification codes require manual review before full access is granted.",
      "Tenant Web Pages — Build multi-section landing pages from the Marketing → Web Pages tab, hosted at /pages/:tenantSlug/:pageSlug with automatic tenant branding.",
      "Platform Admin Switching — Platform admins can switch between tenants using the sidebar dropdown. A 'Viewing as Platform Admin' indicator confirms administrative access.",
      "Ecosystem Links — Quick access to Manage and Hub apps via magic link SSO.",
    ],
  },
  {
    id: "billing-integrations",
    icon: Plug,
    title: "Billing System Integrations",
    bullets: [
      "Tenant Admins can connect billing systems (NISC, GLDS) to automate subscriber synchronization.",
      "Setup — Use the unified Billing Config Dialog to enter API URL and encrypted credentials for each provider.",
      "Test Connection — Perform a dry-run to verify credentials and connectivity before running a full sync.",
      "Sync Now — Trigger a full synchronization that upserts subscriber records via provider-specific backend functions.",
      "Sync History — View all sync attempts with status, record count, provider, and timestamps. Supports realtime auto-refresh, pagination (15 per page), multi-criteria filtering (provider, status, date range), and CSV export.",
      "Integration Cards — Show last sync status with tooltips for error details.",
      "Disconnect — Safely remove credentials while preserving existing subscriber data.",
      "Multi-Source — Subscribers can come from manual entry, CSV upload, or automated billing sync — all tracked by source.",
      "Duplicate Prevention — A unique constraint on (tenant_id, source, external_id) prevents duplicate records during upserts.",
    ],
  },
  {
    id: "subscriber-management",
    icon: Database,
    title: "Subscriber Management",
    bullets: [
      "Tenant Admins maintain a local registry of verified broadband customers.",
      "Manual Entry — Add individual subscribers with account number, name, email, phone, address, ZIP, plan, and service status.",
      "CSV Import — Bulk-upload subscriber records via CSV. Duplicates are skipped based on the unique constraint.",
      "Search & Pagination — Filter subscribers by name, email, or account number with paginated results (25 per page).",
      "Sync Sources — Records are tagged by source (manual, csv, nisc, glds) so you can track where each record originated.",
      "Data Isolation — Strict multi-tenant RLS ensures each tenant can only see and manage their own subscribers.",
    ],
  },
  {
    id: "legacy-import",
    icon: Database,
    title: "Legacy User Import",
    bullets: [
      "Navigate to Admin → Legacy Import to manage historical player records that predate the platform.",
      "CSV Upload — Bulk-import legacy user records with username, email, first/last name, Discord username, ZIP code, address, birthday, and provider name.",
      "Tenant Matching — Legacy records can be linked to a specific tenant by provider name for data isolation.",
      "Account Matching — When a legacy user registers on the platform, the system can match them to their historical record, preserving continuity.",
      "Source Tagging — Legacy records are tagged as 'Legacy' in the Player Directory to distinguish them from new registrations.",
      "Matched Indicator — Successfully matched legacy records display a linked indicator in the tenant's Player Directory.",
    ],
  },
  {
    id: "games-management",
    icon: Gamepad2,
    title: "Games Management",
    bullets: [
      "Manage the game catalog from Admin → Games.",
      "Add games — Set name, slug, category, description, platform tags, cover image (uploaded to storage).",
      "Categories — FPS, Battle Royale, Sports, Fighting, MOBA, MMORPG, RPG, Card Game, Racing, Simulation, Strategy, Party, Puzzle, Adventure, and General.",
      "Edit games — Update any field or toggle active/inactive.",
      "Guide content — Add game-specific markdown guides that feed into the AI Coach's knowledge base.",
      "Display order — Drag-and-drop reordering controls sort order in the catalog.",
      "Tournament linking — Tournaments are dynamically linked to games by name.",
    ],
  },
  {
    id: "game-servers",
    icon: Server,
    title: "Game Server Directory",
    bullets: [
      "Manage dedicated gaming servers from Admin → Game Servers.",
      "Adding Servers — Set server name, select a game from the catalog, enter IP address and port, description, connection instructions, cover image, max players, and display order.",
      "Game Selector — Link each server to a game from your Games Catalog. The server inherits the game's cover image when no custom image is set.",
      "AI Enhance — Use the 'Enhance' button next to Description and Connection Instructions fields to generate polished content via AI, based on the server name and game.",
      "Image Upload — Upload a custom server image from your desktop or pick one from the Media Library. A preview thumbnail displays below the upload controls.",
      "Panel Integration — Optionally connect to a Pterodactyl Panel for live server status monitoring (online/offline state and player counts). Enter the Panel URL and Server ID to enable.",
      "Promo Generation — Use the Promo action button in the server list to generate promotional marketing assets for any server.",
      "Status Indicators — Servers with panel integration display real-time online/offline status dots and live player counts in the public server browser.",
      "Connection Info — Players can copy the server address (IP:Port) with one click and expand 'How to Join' instructions directly on the server card.",
      "Active Toggle — Toggle servers active/inactive to control visibility in the public directory without deleting them.",
      "Display Order — Control the sort order of servers in the public browser using the display order field.",
    ],
  },
  {
    id: "seasons",
    icon: Calendar,
    title: "Season Management",
    bullets: [
      "Seasons track competitive periods from Admin → Seasons.",
      "Create seasons — Define name, start date, end date.",
      "Status flow — draft → active → completed.",
      "Points & Rankings — Season scores accumulate automatically from tournament results (wins, losses, placements).",
      "Leaderboard — Seasonal leaderboard shows rankings by points, wins, or win rate for the active season.",
      "Snapshots — When a season ends, player rankings are frozen as snapshots for historical reference.",
      "Rotation — The rotate-season backend function handles end-of-season snapshot creation and can start a new season.",
      "Export — Season stats can be exported for offline analysis.",
    ],
  },
  {
    id: "leaderboard",
    icon: Shield,
    title: "Leaderboard & Player Stats",
    bullets: [
      "The public Leaderboard (/leaderboard) displays all-time and seasonal rankings.",
      "Sort Options — Sort by points, wins, or win rate. Filter by time period (7/30/90 days), game, or tournament.",
      "Export Rankings — Admins and Moderators can export the current leaderboard view (Seasonal or All-Time) as CSV or PDF using the export buttons beside the search filter.",
      "Player Profiles — Click any player to view their full profile with stats grid, skills radar, match history, game breakdown, rank progression chart, and achievements.",
      "Skills Report — Each player profile includes a Skills Overview Radar showing Win Rate, Score Margin, Consistency, Experience, and per-genre mastery benchmarked against the top 10%.",
      "Player Comparison — The /compare page lets any two players be compared side-by-side with a dual-overlay skills radar chart, per-game breakdown table, season stats, and head-to-head match history.",
      "Per-Game Breakdown — The Compare page includes a table showing win rate, score margin, and match count for every game both players have competed in.",
      "Season Stats — Dedicated /season-stats page shows current season performance with visual charts and historical data.",
      "Shareable Links — Comparison URLs can be copied and shared on the community forum.",
    ],
  },
  {
    id: "deep-stats",
    icon: Activity,
    title: "Deep Stats & Skill Insights",
    bullets: [
      "The Deep Stats hub (/stats) provides advanced analytics beyond simple win/loss records.",
      "Game Filter — Players can filter performance metrics by specific game title.",
      "Season Filter — Narrow results to any season's date range for focused trend analysis.",
      "Skill Insights Engine — Benchmarks each player's Win Rate, Score Margin, Consistency, and Experience against the top 10% of the community.",
      "Skills Overview Radar — A radar chart maps proficiency across core dimensions and per-genre mastery (Fighting, Shooters, MOBA, etc.).",
      "Genre Insights — Categorizes player performance per game category as Strength, Average, or Needs Improvement.",
      "Actionable Tips — Each game benchmark includes a personalized tip based on the player's gap vs top performers.",
      "My Stats — A personalized dashboard aggregating performance across all games and seasons.",
      "Admin Impact — The quality of skill insights improves as more tournaments and matches are recorded. Encourage tournament creation and score entry for richer data.",
    ],
  },
  {
    id: "community",
    icon: Users,
    title: "Community Forum",
    bullets: [
      "The Community forum (/community) provides a discussion space for players.",
      "Topics — Users create discussion threads with a title, body, and category (General, Strategy, LFG, etc.).",
      "Replies & Likes — Threaded replies and a like system for engagement.",
      "Pinned Topics — Admins can pin important announcements to the top of the forum.",
      "Moderation — Admins and Moderators can manage content and enforce community standards.",
      "Categories — Help organize discussions and make topics easier to discover.",
    ],
  },
  {
    id: "media-library",
    icon: Image,
    title: "Media Library",
    bullets: [
      "Upload and manage images from Admin → Media Library.",
      "Upload — Drag-and-drop or browse. Files are stored in the app-media storage bucket.",
      "Categories & Tags — Organize media with category selectors (general, games, tournament, badge, trophy, banner, challenges, marketing) and custom tags for easy discovery and filtering.",
      "Bulk Selection & Delete — Click any image's checkbox to enter selection mode. Once in selection mode, clicking any card toggles its selection. A floating action bar appears at the bottom of the screen showing the count of selected items, Select All / Deselect All, and a Delete Selected button with confirmation dialog.",
      "Image Preview — Click any image (when not in selection mode) to open a full-size preview dialog with zoom (scroll wheel or +/- buttons), pan (click and drag when zoomed), and reset controls.",
      "Single Actions — Hover over any image card to reveal quick-action buttons for copying the URL to clipboard or deleting that individual item (with confirmation).",
      "Widget Library — Store and distribute third-party interactive components (e.g., Common Ninja embeds). Admins save HTML snippets with file_type 'embed' and category 'widget'. Widgets display with thumbnail previews and are available to tenants via the Media Picker.",
      "Template Gallery — Browse reusable design templates with thumbnail previews. Templates include 'locked zones' that anchor brand elements (logos, headers) while allowing customization of other areas.",
      "Asset Editor — An HTML5 Canvas-based design tool with layers, snap-to-grid, shape primitives (rectangles, circles, lines), fill/stroke/opacity controls, z-order management (Bring Forward, Send Backward), and context-sensitive cursors (grab for movable objects, closed hand during drags, not-allowed for locked elements). Export at 2x resolution as PNG.",
      "Social Media Presets — The Asset Editor includes format presets for Instagram, Facebook, Twitter, and other social platforms, ensuring correct dimensions for each channel.",
      "Publish Dropdown — After designing an asset, use the Publish button in the editor footer (alongside Download and Save as New Asset) to post directly to connected social accounts. The dropdown filters platforms by canvas format compatibility (e.g., Square → Instagram/Facebook/Twitter, Story → Instagram/Facebook).",
      "Schedule for Later — From the Publish dropdown, choose 'Schedule for Later' to pick a future date and time. The post is queued and delivered automatically by the backend scheduler.",
      "Quick Create (⚡) — Instantly generate promotional assets from tournament or challenge data using a streamlined one-click flow.",
      "Full Edit (✏️) — Open the full Canvas Editor for detailed design work with complete layer and shape control.",
      "'From Event' Promo Picker — Auto-map tenant event data (name, date, game, hero image) to design overlays for rapid promotional asset creation.",
      "AI Image Generation — Generate images using built-in AI capabilities. The default model is google/gemini-3-pro-image-preview via the Lovable AI Gateway.",
      "AI Image Config — Admins can switch between the default AI provider and a Custom API (OpenAI-compatible) from Admin → Settings → AI Image Config. Custom endpoints support masked API keys for security.",
      "Usage — Select media for tournament hero images, game covers, page heroes, and page backgrounds.",
      "File Details — Track file name, type, size, and MIME type for each upload.",
      "Media Picker — A reusable media picker dialog is available throughout the platform when selecting images.",
    ],
  },
  {
    id: "page-appearance",
    icon: Settings,
    title: "Page Appearance & Backgrounds",
    bullets: [
      "Configure visual customization from Admin → Settings.",
      "Page Backgrounds — Set custom background images with adjustable opacity for any managed page.",
      "Page Heroes — Configure hero banner images with custom titles and subtitles per page.",
      "Managed Pages — The system tracks which pages support backgrounds and/or hero images.",
      "Media Picker — Select images from the Media Library when configuring page appearance.",
      "Changes take effect immediately for all users across the platform.",
    ],
  },
  {
    id: "bypass-codes",
    icon: KeyRound,
    title: "Bypass Codes",
    bullets: [
      "Manage registration bypass codes from Admin → Bypass Codes.",
      "Purpose — Allow user registration without ZIP code verification (useful for staff, testers, or special access).",
      "Create codes — Set a unique code string with optional description.",
      "Set limits — Configure max uses and expiration dates.",
      "Track usage — Monitor how many times each code has been used.",
      "Deactivate — Toggle codes active/inactive without deleting them.",
    ],
  },
  {
    id: "app-settings",
    icon: Settings,
    title: "App Settings",
    bullets: [
      "Configure global settings from Admin → Settings.",
      "Key-Value Pairs — App settings are stored as key-value configuration pairs for platform-wide behavior.",
      "Descriptions — Each setting includes a description field explaining its purpose.",
      "Dynamic Updates — Changes take effect immediately without requiring a restart.",
    ],
  },
  {
    id: "ai-coach",
    icon: BrainCircuit,
    title: "AI Coach Configuration",
    bullets: [
      "The AI Esports Coach is a floating chat widget (FAB) accessible from any page via the sidebar or the bottom-right button.",
      "Game Selection — Players choose a game from a prominent labeled dropdown; the coach tailors advice using category-specific frameworks (Shooter, MOBA, Fighting, etc.).",
      "Knowledge Sources — Responses are grounded in local markdown guides (stored per game in the Games catalog) and external Open Notebook search results.",
      "Conversation History — All sessions are persisted in the database, allowing players to resume previous coaching conversations.",
      "Streaming Responses — The coach streams replies in real time for a natural conversational experience.",
      "Category Suggestions — The coach offers context-aware suggestions based on the selected game's category.",
      "Export — Players can export coaching sessions as .md or .pdf files.",
      "Tip: Add detailed game-specific guides via Admin → Games → Guide Content to improve coach accuracy.",
    ],
  },
  {
    id: "notebook-connections",
    icon: BookOpen,
    title: "Notebook Connections",
    bullets: [
      "Manage external knowledge bases from Admin → Notebooks.",
      "Adding Connections — Set a display name, the API URL of your Open Notebook instance, and the target Notebook ID.",
      "Game Mapping — Optionally link a notebook connection to a specific game using the Game selector. Game-linked notebooks provide RAG context for AI-enhanced quest narratives.",
      "Shared Credentials — The API password is stored as a backend secret (OPEN_NOTEBOOK_PASSWORD), shared across all connections pointing to the same host.",
      "Health Checks — Use the built-in health check to verify VPS connectivity and credential validity before relying on a connection.",
      "How It Works — The notebook-proxy backend function handles all communication with the external VPS, bypassing CORS and keeping credentials secure.",
      "AI Quest Narratives — When a quest is linked to a game that has a notebook connection, the AI narrative enhancement pulls context from that notebook to generate richer, game-specific story text.",
      "Tip: You can connect multiple notebooks (e.g., one per game or topic) to broaden the AI Coach's knowledge base and improve quest narrative generation.",
    ],
  },
  {
    id: "ecosystem",
    icon: ExternalLink,
    title: "FGN Ecosystem Navigation",
    bullets: [
      "The FGN ecosystem consists of three interconnected applications: Play (this app), Manage (ISP subscriber verification), and Hub (partner hub for creative assets and marketing).",
      "Magic Link SSO — Admins and Tenant Admins can jump between ecosystem apps via magic link authentication from the sidebar's Ecosystem section.",
      "How It Works — Clicking 'Manage' or 'Hub' generates a one-time token stored in ecosystem_auth_tokens, then redirects the user to the target app for seamless sign-in.",
      "Token Security — Tokens expire after a short window and can only be used once.",
      "Unified Experience — While authentication is independent across apps, the sidebar links provide a cohesive workflow for managing subscribers, brands, and gaming content.",
    ],
  },
  {
    id: "ecosystem-quickstart",
    icon: Plug,
    title: "Ecosystem Integration Quick-Start",
    bullets: [
      "This guide walks through connecting the FGN gaming platform to an external LMS (e.g. FGN Academy, SimuCDL, BroadbandWorkforce) so that gaming milestones automatically grant career-path credit.",
      "Step 1 — Get your API Key: Go to Admin → Ecosystem. The API key is auto-generated on the first external API call, or click 'Regenerate' to create a new one. Share this key with your LMS administrator; external apps send it in the X-Ecosystem-Key header.",
      "Step 2 — Identify your LMS Path & Module IDs: Log in to your external LMS and locate the career learning path you want to map. Copy its unique path identifier (e.g. 'cdl-class-a', 'fiber-tech-101'). If the path has sub-modules, note those IDs too (e.g. 'module-safety-101'). If the LMS doesn't expose IDs, agree on a naming convention with your LMS team (e.g. 'path-001', 'module-001') and configure both systems to use the same values.",
      "Step 3 — Create a Career Path Mapping: In Admin → Ecosystem → Career Path Mappings, select the Target App (academy, simu-cdl, or broadband), optionally choose a Game and/or Challenge to scope the mapping, then enter the external_path_id and optional external_module_id from Step 2. Choose a credit type (Completion, Evidence, or Hours) and set the credit value.",
      "Step 4 — Set up a Webhook: In Admin → Ecosystem → Outbound Webhooks, add a webhook for the relevant event (e.g. 'challenge.completed' or 'evidence.approved'). Enter the URL your LMS exposes to receive push notifications. The system generates an HMAC secret — share this with your LMS team so they can verify payload authenticity.",
      "Step 5 — Test the integration: Click the 'Test' button (paper plane icon) next to your webhook to fire a test payload. Check the Sync Log section at the bottom of the Ecosystem page to confirm delivery status.",
      "Step 6 — Calendar Feed (optional): Share the public calendar feed URL with external apps. It merges tournaments, tenant events, and challenge deadlines. Available in JSON and iCal formats — no authentication required.",
      "Common LMS path ID locations: In Moodle, find Course ID in the URL (course/view.php?id=123). In Canvas, the course ID is in the URL path (/courses/456). For custom LMS platforms, check with your vendor for their API resource identifiers.",
      "Tip: You can create multiple mappings for the same game or challenge targeting different LMS platforms. Each mapping fires independently when the linked event occurs.",
      "Tip: If you change an LMS path ID later, update the mapping here and in the LMS to keep them in sync. Old mappings will stop granting credit until corrected.",
    ],
  },
  {
    id: "registration-flow",
    icon: UserPlus,
    title: "Registration & ZIP Verification",
    bullets: [
      "New users register with email and password, then verify their email before signing in.",
      "ZIP Code Check — During registration, users enter their ZIP code which is matched against tenant service areas to connect them with eligible broadband providers.",
      "Bypass Codes — Users with a valid bypass code can skip ZIP verification entirely.",
      "Tenant Codes — If no platform bypass code matches, the system also checks tenant-scoped codes. 'Access' codes grant immediate entry, while 'override' and 'verification' codes flag the user for manual review.",
      "Profile Setup — After registration, users are prompted to set a display name, gamer tag, and avatar.",
      "Provider Matching — The lookup_providers_by_zip database function returns matching tenants for a given ZIP code, creating a lead (user_service_interests) automatically.",
    ],
  },
  {
    id: "challenges",
    icon: Target,
    title: "Challenges & Quests",
    bullets: [
      "Challenges are task-based work-order objectives that reward players with season points upon completion.",
      "Moderators create and manage challenges from the Moderator Dashboard → Challenges & Quests.",
      "Each challenge has a name, description, point reward, optional game link, difficulty level (Beginner / Intermediate / Advanced), estimated completion time, type (Daily, Weekly, Monthly, or One-Time), and optional start/end dates.",
      "Cover Images — Upload a cover image or select one from the Media Library to make challenges visually distinct.",
      "AI-Enhanced Descriptions — Use the AI enhance button to automatically improve challenge descriptions for clarity and engagement.",
      "Task Checklists — Build multi-step task checklists within a challenge. Players must complete each task and upload evidence per step.",
      "Evidence Review — Moderators review evidence per-item with approve/reject actions and feedback notes. Bulk actions include 'Approve All & Complete' and 'Reject Enrollment'.",
      "Quests — Admins can also create and manage quests from the 'Quests' tab on the same page. Quests use an identical workflow but are tracked in separate tables.",
      "Quest Chains — The 'Chains' tab lets you create sequential quest progressions. Each chain has a name, description, story intro/outro text, cover image, bonus points for chain completion, and an optional linked achievement.",
      "Chain Ordering — Quests within a chain are ordered by their chain_order field. Players must complete quests sequentially — earlier quests unlock later ones.",
      "AI-Enhanced Narratives — Use the Sparkles (✨) button on story_intro and story_outro fields in the Create/Edit Quest and Chain dialogs to auto-generate rich narrative text. If the quest's game has a linked notebook connection, the AI uses RAG to pull game-specific context.",
      "XP Rewards — Quests award XP in addition to season points. The XP feeds into a five-tier rank system (Novice → Apprentice → Journeyman → Expert → Master) tracked per player.",
      "Chain Completion — When a player finishes all quests in a chain, bonus points are awarded automatically via a database trigger, and an optional achievement badge is granted.",
      "Players view active challenges at /challenges and quests at /quests, and can see which ones they've already completed.",
      "Post-Publication Task Editing — Admins and Moderators can add, edit, reorder, and remove tasks on published challenges directly from the Edit dialog on the challenge detail page.",
      "Approval Notifications — When a challenge submission is approved, the player automatically receives an in-app notification with the challenge name and points earned.",
      "Challenge completions are recorded by moderators and automatically award points to the player's season score.",
      "Max completions can be set to limit how many players can complete a challenge.",
    ],
  },
  {
    id: "prize-shop",
    icon: Gift,
    title: "Prize Shop",
    bullets: [
      "The Prize Shop (/prize-shop) lets players spend earned season points on rewards.",
      "Moderators create prizes with name, description, point cost, optional image, and available quantity.",
      "Players browse active prizes, see their current point balance, and submit redemption requests.",
      "A confirmation dialog shows point cost and remaining balance before submitting.",
      "Redemptions go into a pending queue reviewed by moderators at Moderator → Redemptions.",
      "Moderators can approve, fulfill, or deny redemption requests with optional notes.",
      "Players can track their redemption history and status from the 'My Requests' tab.",
    ],
  },
  {
    id: "ladders",
    icon: Swords,
    title: "Ranked Ladders",
    bullets: [
      "Ranked Ladders (/ladders) provide persistent ELO-based competitive rankings outside of tournaments.",
      "Moderators create ladders from the Moderator Dashboard → Ladders, optionally linking them to a specific game.",
      "Players browse active ladders and join them with a single click.",
      "Each ladder displays a live leaderboard sorted by rating, showing wins, losses, and rank.",
      "Moderators manage ladder entries (update ratings, record wins/losses) from the Moderator Dashboard.",
      "Players can participate in multiple ladders simultaneously.",
    ],
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Notification System",
    bullets: [
      "The platform includes an automated notification system that alerts players via in-app notifications and email across 7 event types.",
      "In-App Notifications — Players see a bell icon in the sidebar with an unread count badge. Clicking opens a slide-out panel with all notifications.",
      "Real-Time Delivery — Notifications are pushed instantly via real-time subscriptions — no page refresh needed.",
      "Prize Redemption Alerts — When a moderator approves, fulfills, or denies a redemption, the player is automatically notified with the prize name and new status.",
      "New Challenge Alerts — When a new active challenge is created from the Moderator Dashboard, all registered players receive a notification with the challenge name and point reward.",
      "Tournament Starting — When a tournament status changes to 'In Progress', all registered players are notified that it's live.",
      "Upcoming Tournament Reminder — A scheduled job runs every hour and sends reminders ~24 hours before a tournament starts to all registered players. Duplicate reminders are automatically prevented.",
      "Registration Confirmed — Players receive instant confirmation when they register for a tournament.",
      "Match Completed — Both players in a match are notified when the result is recorded, with a congratulatory message for the winner.",
      "Achievement Earned — Players are notified when they unlock a new achievement or badge, including the tier and name.",
      "Email Notifications — Redemption status changes and new challenges also trigger email notifications via the Resend integration.",
      "Automatic Triggers — All 7 notification types are generated by database triggers (or scheduled jobs), requiring no manual action from moderators beyond their normal workflows.",
      "Player Preferences — Players can independently toggle In-App and Email channels for each notification type from their Profile Settings page. All channels default to enabled.",
      "Mark as Read — Players can mark individual notifications as read or clear all at once.",
      "Deep Links — Each notification includes a link to the relevant page (Prize Shop, Challenges, Tournament, Achievements) for one-click navigation.",
      "Tip: The notification system works automatically — just manage tournaments, approve redemptions, and create challenges as usual, and players will be notified.",
    ],
  },
  {
    id: "discord-integration",
    icon: ExternalLink,
    title: "Discord Integration",
    bullets: [
      "All players are required to link their Discord account after registration before accessing the platform.",
      "Discord linking uses OAuth2 with the 'identify' and 'guilds.members.read' scopes.",
      "A unique constraint prevents two FGN accounts from linking the same Discord account.",
      "Discord usernames are displayed in tournament brackets and leaderboards as the primary player identity.",
      "If DISCORD_GUILD_ID and DISCORD_VERIFIED_ROLE_ID secrets are configured, the system automatically assigns a 'Verified Player' role in the FGN Discord server upon linking.",
      "Players can unlink or re-link their Discord account from Profile Settings. Unlinking blocks platform access until re-linked.",
      "Three secrets are required: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, and DISCORD_BOT_TOKEN.",
      "Optional secrets for server role management: DISCORD_GUILD_ID and DISCORD_VERIFIED_ROLE_ID.",
    ],
  },
  {
    id: "marketing",
    icon: Megaphone,
    title: "Marketing Dashboard",
    bullets: [
      "Manage marketing campaigns, calendar embeds, and web pages from Admin → Marketing Dashboard.",
      "Tabbed Layout — The Marketing Dashboard consolidates three tabs: Campaigns, Calendars, and Web Pages for centralized promotional management.",
      "Campaigns — Create campaigns with a title, description, category, and optional social copy for coordinated promotions.",
      "Assets — Upload marketing images and files to campaigns. Each asset has a label, display order, and dimension metadata.",
      "Publishing — Toggle campaigns between draft and published states to control visibility.",
      "Tenant Access — Tenant admins can browse published campaigns and download assets for local marketing use via the Tenant → Marketing section.",
      "Categories — Organize campaigns by category (social media, print, digital, event) for easy filtering.",
      "Calendar Embeds — Publish branded calendar embed widgets showing your tournaments and tenant events. Embed widgets can be customized with logo, brand colors, and background image, then shared via embed code for use on external websites.",
      "Web Pages — Build multi-section promotional landing pages using 7 block types: Hero, Text Block (Markdown), Image Gallery, CTA, Embed Widget, Banner, and Video.",
      "Page Hosting — Published pages are accessible at /pages/:tenantSlug/:pageSlug and automatically apply tenant branding (logo and accent colors).",
      "HTML Export — Export any web page as a standalone, self-contained HTML file with inline CSS and embedded media for hosting on external websites.",
      "Social Accounts Tab — Connect Facebook, Instagram, Twitter/X, and LinkedIn accounts by providing API access tokens. Credentials are stored securely and used for direct publishing.",
      "Format-Aware Publishing — The Asset Editor's Publish dropdown automatically filters connected accounts by canvas format: Square → Instagram/Facebook/Twitter/LinkedIn, Landscape → Facebook/Twitter/LinkedIn, Portrait → Instagram/Facebook, Story → Instagram/Facebook.",
      "Caption Field — Add post text via a caption textarea that appears when social accounts are connected. Captions are included with both immediate publishes and scheduled posts.",
      "Schedule for Later — Pick a future date and time from the Asset Editor to queue a post. Scheduled posts are stored in the queue and processed automatically.",
      "Scheduled Posts Tab — View all queued, published, and failed posts in a calendar/list view. Click any post to see details, reschedule to a new date, or cancel pending posts.",
      "Automated Delivery — A backend job processes the scheduled posts queue every 5 minutes, publishing content to the appropriate social platform and updating status (published or failed with error details).",
    ],
  },
  {
    id: "tenant-events",
    icon: CalendarDays,
    title: "Tenant Events",
    bullets: [
      "Tenants can create and manage their own events from the Tenant → Events section.",
      "Event Creation — Set name, game, format, dates, max participants, description, rules, prize configuration, participation points, and a hero image selected from the Media Library.",
      "Multi-Date Scheduling — Create multiple event instances from a single dialog using the multi-date calendar picker with time pickers. Each date generates a separate event with an auto-appended date suffix.",
      "Prize Modes — Choose between 'None', 'Physical Prize' (linked to a Prize Shop item), or 'Value' (configurable percentage split for top finishers, default 50/30/20, must sum to 100%).",
      "Participation Points — Configure points awarded to all participants regardless of placement.",
      "Discord Role Assignment — Optionally assign a specific Discord role to players upon event registration.",
      "Request Moderator — Tenant Admins and Marketing staff can request a platform moderator for their event. This sends an automated email to support@fgn.gg with event details and the requester's contact information.",
      "Public Events — Toggle events as public to make them visible on a shareable public page at /events/:tenantSlug.",
      "Registration — Players can register for public tenant events directly from the public event page.",
      "Event Assets — Upload supporting images and files to events for promotional use.",
      "Social Copy — Add social media copy for easy sharing across platforms.",
      "Tenant Branding — Public event pages automatically apply the tenant's logo and brand colors via CSS variables for a professional, branded appearance.",
    ],
  },
  {
    id: "theme-appearance",
    icon: Moon,
    title: "Theme & Visual Customization",
    bullets: [
      "The platform supports dark and light themes, selectable from the sidebar footer's Theme toggle.",
      "System Mode — Players can choose 'System' to match their device preference automatically.",
      "Persistence — Theme choice is saved in localStorage and persists across sessions.",
      "Page Backgrounds — Admins can set custom background images with adjustable opacity per page from Admin → Settings.",
      "Page Heroes — Configure hero banners with custom titles and subtitles for managed pages.",
      "Cookie Consent — A cookie consent banner appears on first visit. Players can accept or decline; the choice is persisted.",
    ],
  },
  {
    id: "legal-pages",
    icon: Scale,
    title: "Legal Pages",
    bullets: [
      "The platform includes four legal pages accessible from the home page footer.",
      "Terms & Conditions (/terms) — Governs platform usage, account rules, intellectual property, and liability.",
      "Privacy Policy (/privacy) — Covers data collection, usage, and protection practices.",
      "Acceptable Use Policy (/acceptable-use) — Outlines prohibited activities (cheating, harassment, exploits) and consequences.",
      "Disabled Users Notice (/disabled-users) — Accessibility commitments (WCAG compliance) and account suspension/appeals process.",
      "All legal pages include a Download PDF feature for offline reference.",
    ],
  },
];

// Build JSX content from bullet data for the accordion
const sections = sectionData.map((s) => ({
  ...s,
  content: (
    <div className="space-y-3">
      <ul className="list-disc pl-5 space-y-2">
        {s.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  ),
}));

const permissionRows = [
  { feature: "Admin Dashboard", admin: true, marketing: false, manager: false },
  { feature: "User Management", admin: true, marketing: false, manager: false },
  { feature: "Access Requests", admin: true, marketing: false, manager: false },
  { feature: "Tournament Management", admin: true, marketing: false, manager: false },
  { feature: "Badge / Achievement System", admin: true, marketing: false, manager: true },
  { feature: "Games Management", admin: true, marketing: false, manager: false },
  { feature: "Season Management", admin: true, marketing: false, manager: false },
  { feature: "Media Library", admin: true, marketing: false, manager: false },
  { feature: "Asset Editor", admin: true, marketing: true, manager: false },
  { feature: "AI Image Config", admin: true, marketing: false, manager: false },
  { feature: "Page Appearance & Backgrounds", admin: true, marketing: false, manager: false },
  { feature: "Bypass Codes", admin: true, marketing: false, manager: false },
  { feature: "App Settings", admin: true, marketing: false, manager: false },
  { feature: "AI Coach Configuration", admin: true, marketing: false, manager: false },
  { feature: "Notebook Connections", admin: true, marketing: false, manager: false },
  { feature: "Legacy User Import", admin: true, marketing: false, manager: false },
  { feature: "Deep Stats & Skill Insights", admin: true, marketing: false, manager: true },
  { feature: "Community Moderation", admin: true, marketing: false, manager: false },
  { feature: "Ecosystem Navigation", admin: true, marketing: false, manager: false },
  { feature: "Marketing Campaigns", admin: true, marketing: true, manager: false },
  { feature: "Marketing → Web Pages", admin: true, marketing: true, manager: false },
  { feature: "Marketing → Calendar Embeds", admin: true, marketing: true, manager: false },
  { feature: "Social Accounts (Connect/Manage)", admin: true, marketing: true, manager: false },
  { feature: "Scheduled Posts (View/Manage)", admin: true, marketing: true, manager: false },
  { feature: "Legal Pages (view)", admin: true, marketing: true, manager: true },
  { feature: "Challenges & Quests", admin: true, marketing: false, manager: true },
  { feature: "Quest Chains (Manage)", admin: true, marketing: false, manager: true },
  { feature: "Prize Shop (Manage Prizes)", admin: true, marketing: false, manager: true },
  { feature: "Prize Redemptions (Review)", admin: true, marketing: false, manager: true },
  { feature: "Notification System (Auto)", admin: true, marketing: false, manager: true },
  { feature: "Ranked Ladders (Manage)", admin: true, marketing: false, manager: true },
  { feature: "Tenant Dashboard", admin: true, marketing: false, manager: true },
  { feature: "Tenant Leads", admin: true, marketing: false, manager: true },
  { feature: "Tenant Events", admin: true, marketing: true, manager: true },
  { feature: "Tenant Marketing Assets", admin: true, marketing: true, manager: true },
  { feature: "Tenant Codes", admin: true, marketing: false, manager: false },
  { feature: "Tenant Codes (read-only)", admin: false, marketing: true, manager: false },
  { feature: "Tenant Web Pages", admin: true, marketing: true, manager: false },
  { feature: "Tenant ZIP Codes", admin: true, marketing: false, manager: false },
  { feature: "Tenant Subscribers", admin: true, marketing: false, manager: false },
  { feature: "Tenant Integrations", admin: true, marketing: false, manager: false },
  { feature: "Tenant Team Management", admin: true, marketing: false, manager: false },
];

const AdminGuide = () => {
  const [search, setSearch] = useState("");
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handlePrint = () => {
    const permRows = permissionRows
      .map((r) => `<tr><td>${r.feature}</td><td style="text-align:center">${r.admin ? "✅" : "—"}</td><td style="text-align:center">${r.marketing ? "✅" : "—"}</td><td style="text-align:center">${r.manager ? "✅" : "—"}</td></tr>`)
      .join("");

    const sectionBlocks = sectionData
      .map((s) => {
        const items = s.bullets.map((b) => `<li>${b}</li>`).join("");
        return `<div class="section"><h2>${s.title}</h2><ul>${items}</ul></div>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Admin & Manager Guide</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;padding:40px;max-width:900px;margin:auto;font-size:13px}
  h1{font-size:24px;margin-bottom:2px} h2{font-size:16px;margin-top:24px;border-bottom:2px solid #0cc;padding-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:8px} th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #e0e0e0}
  th{background:#f5f5f5;font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:.05em}
  .section{page-break-inside:avoid;margin-bottom:16px}
  ul{padding-left:20px;margin:4px 0} li{margin:4px 0}
  @media print{body{padding:20px}}
</style></head><body>
<h1>Admin &amp; Manager Guide</h1>
<p style="color:#888;font-size:12px">Reference documentation for platform administrators and tenant managers.</p>
<h2>Quick-Reference Permissions</h2>
<table><thead><tr><th>Feature</th><th style="text-align:center">Admin</th><th style="text-align:center">Marketing</th><th style="text-align:center">Manager</th></tr></thead><tbody>${permRows}</tbody></table>
${sectionBlocks}
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections.filter((s) => s.title.toLowerCase().includes(q));
  }, [search]);

  const filteredPermissions = useMemo(() => {
    if (!search.trim()) return permissionRows;
    const q = search.toLowerCase();
    return permissionRows.filter((r) => r.feature.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Admin & Manager Guide
          </h1>
          <p className="text-muted-foreground mt-1">
            Reference documentation for platform administrators and tenant managers.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} className="shrink-0 gap-2">
          <Printer className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search topics…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredSections.length > 0 && (
        <nav className="border border-border rounded-lg bg-card/50 px-4 py-3">
          <h2 className="font-heading font-semibold text-sm uppercase tracking-widest text-primary mb-2">Table of Contents</h2>
          <ul className="columns-2 gap-x-6 text-sm space-y-1">
            {filteredSections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#section-${s.id}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors py-0.5"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <s.icon className="h-3.5 w-3.5 shrink-0" />
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {filteredPermissions.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden bg-card/50">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-heading font-semibold text-sm uppercase tracking-widest text-primary">Quick-Reference Permissions</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left px-4 py-2 font-heading font-medium">Feature</th>
                <th className="text-center px-4 py-2 font-heading font-medium">Admin</th>
                <th className="text-center px-4 py-2 font-heading font-medium">Marketing</th>
                <th className="text-center px-4 py-2 font-heading font-medium">Manager</th>
              </tr>
            </thead>
            <tbody>
              {filteredPermissions.map((row) => (
                <tr key={row.feature} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2">{row.feature}</td>
                  <td className="text-center px-4 py-2">{row.admin ? "✅" : "—"}</td>
                  <td className="text-center px-4 py-2">{row.marketing ? "✅" : "—"}</td>
                  <td className="text-center px-4 py-2">{row.manager ? "✅" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredSections.length > 0 ? (
        <Accordion type="multiple" defaultValue={search.trim() ? filteredSections.map(s => s.id) : []} key={search} className="space-y-2">
          {filteredSections.map((section) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              id={`section-${section.id}`}
              className="border border-border rounded-lg px-4 bg-card/50 scroll-mt-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <section.icon className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-heading font-semibold text-base">
                    {section.title}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed">
                {section.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : filteredPermissions.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No results found for &ldquo;{search}&rdquo;</p>
      ) : null}

      {showTop && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default AdminGuide;
