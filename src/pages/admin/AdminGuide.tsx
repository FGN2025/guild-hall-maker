import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
} from "lucide-react";

const sections = [
  {
    id: "overview",
    icon: Shield,
    title: "Admin vs Manager Roles",
    content: (
      <div className="space-y-3">
        <p>The platform has two privileged roles beyond regular players:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Super Admin / Admin</strong> — Full access to the Admin Panel, all settings, user management, tournament control, badge awarding, tenant configuration, and ecosystem tools.</li>
          <li><strong>Tenant Manager</strong> — Scoped access within a specific Tenant portal. Managers can view leads and the tenant dashboard but cannot manage ZIP codes, subscribers, or team settings.</li>
        </ul>
        <p className="text-muted-foreground text-sm">Roles are assigned via the Admin → Users panel or Tenant → Team page. A user can hold both an app-level role and a tenant role simultaneously.</p>
      </div>
    ),
  },
  {
    id: "user-management",
    icon: Users,
    title: "User Management",
    content: (
      <div className="space-y-3">
        <p>Navigate to <strong>Admin → Users</strong> to manage platform accounts.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>View all users</strong> — Browse registered accounts with display name, email, gamer tag, and role.</li>
          <li><strong>Assign roles</strong> — Promote a user to Admin or Moderator, or revoke elevated access.</li>
          <li><strong>Search</strong> — Filter by name, email, or gamer tag to locate specific accounts.</li>
        </ul>
        <p className="text-muted-foreground text-sm">Tip: Only Super Admins can promote other users to Admin. Moderators have limited elevated permissions.</p>
      </div>
    ),
  },
  {
    id: "tournament-management",
    icon: Trophy,
    title: "Tournament Management",
    content: (
      <div className="space-y-3">
        <p>Admins have full control over the tournament lifecycle from <strong>Admin → Tournaments</strong>.</p>
        <h4 className="font-semibold mt-2">Creating a Tournament</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Set name, game, format (single elimination), date/time, and max participants.</li>
          <li>Add a description, rules, prize pool, and entry fee.</li>
          <li>Upload or select a hero image from the media library.</li>
        </ul>
        <h4 className="font-semibold mt-2">Managing Registrations</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>View registered players on the tournament detail page.</li>
          <li>Change tournament status: Upcoming → Open → In Progress → Completed.</li>
        </ul>
        <h4 className="font-semibold mt-2">Bracket & Scoring</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Generate a single-elimination bracket from the manage page.</li>
          <li>Enter match scores — winners advance automatically.</li>
          <li>Season points are awarded upon tournament completion.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "badge-awarding",
    icon: Award,
    title: "Badge & Achievement Awarding",
    content: (
      <div className="space-y-3">
        <p>Manage achievements from <strong>Admin → Achievements</strong>.</p>
        <h4 className="font-semibold mt-2">Creating Badges</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Define a name, description, icon, category, and tier (Bronze / Silver / Gold / Platinum).</li>
          <li>Set optional auto-criteria for automatic awarding based on player activity.</li>
          <li>Control display order and active status.</li>
        </ul>
        <h4 className="font-semibold mt-2">Manual Awarding</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>From a player's profile or the achievements admin page, you can manually award any badge.</li>
          <li>Add optional notes explaining why the badge was granted.</li>
        </ul>
        <p className="text-muted-foreground text-sm">Tip: Use tiers to create progression paths — e.g., "Tournament Veteran" at Bronze (5 tournaments), Silver (15), Gold (50), Platinum (100).</p>
      </div>
    ),
  },
  {
    id: "tenant-config",
    icon: Building2,
    title: "Tenant Configuration",
    content: (
      <div className="space-y-3">
        <p>Tenants represent Broadband Service Providers. Manage them from <strong>Admin → Tenants</strong>.</p>
        <h4 className="font-semibold mt-2">Creating a Tenant</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Set name, slug (URL identifier), contact email, and optional logo.</li>
          <li>Tenants start with "active" status.</li>
        </ul>
        <h4 className="font-semibold mt-2">Assigning Tenant Admins</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Add existing platform users as Tenant Admins or Managers.</li>
          <li>Tenant Admins get full access; Managers see only leads and dashboards.</li>
        </ul>
        <h4 className="font-semibold mt-2">ZIP Code Coverage</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Each tenant manages a set of ZIP codes representing their service area.</li>
          <li>During registration, players' ZIP codes are matched to tenants to generate leads.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "tenant-portal",
    icon: BarChart3,
    title: "Tenant Portal (Manager View)",
    content: (
      <div className="space-y-3">
        <p>Tenant Admins and Managers access the <strong>Tenant Panel</strong> from the main sidebar.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Dashboard</strong> — Overview of leads, subscribers, and key metrics for your service area.</li>
          <li><strong>Leads</strong> — View and manage user service interests. Update lead status (New → Contacted → Converted).</li>
          <li><strong>ZIP Codes</strong> (Admin only) — Add or remove ZIP codes from your coverage area.</li>
          <li><strong>Subscribers</strong> (Admin only) — View and manage subscriber records, import via CSV.</li>
          <li><strong>Team</strong> (Admin only) — Invite managers, update roles, remove team members.</li>
        </ul>
        <p className="text-muted-foreground text-sm">Managers can only see Dashboard and Leads. All other sections require the Tenant Admin role.</p>
      </div>
    ),
  },
  {
    id: "games-management",
    icon: Gamepad2,
    title: "Games Management",
    content: (
      <div className="space-y-3">
        <p>Manage the game catalog from <strong>Admin → Games</strong>.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Add games</strong> — Set name, slug, category, description, platform tags, and cover image.</li>
          <li><strong>Edit games</strong> — Update any field or toggle active/inactive status.</li>
          <li><strong>Guide content</strong> — Add game-specific guides in markdown that appear on the game detail page.</li>
          <li><strong>Display order</strong> — Control the sort order in the games catalog.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "seasons",
    icon: Calendar,
    title: "Season Management",
    content: (
      <div className="space-y-3">
        <p>Seasons track competitive periods from <strong>Admin → Seasons</strong>.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Create seasons</strong> — Define name, start date, and end date.</li>
          <li><strong>Status management</strong> — Seasons move through draft → active → completed.</li>
          <li><strong>Points & rankings</strong> — Season scores accumulate from tournament results automatically.</li>
          <li><strong>Rotation</strong> — When a season ends, snapshots are taken and a new season can begin.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "media-library",
    icon: Image,
    title: "Media Library",
    content: (
      <div className="space-y-3">
        <p>Upload and manage images from <strong>Admin → Media Library</strong>.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Upload</strong> — Drag-and-drop or browse to upload images.</li>
          <li><strong>Categories & Tags</strong> — Organize media with categories and tags for easy discovery.</li>
          <li><strong>AI Generation</strong> — Generate images using the built-in AI image generator.</li>
          <li><strong>Usage</strong> — Media can be selected as tournament images, game covers, page heroes, and backgrounds.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "bypass-codes",
    icon: KeyRound,
    title: "Bypass Codes",
    content: (
      <div className="space-y-3">
        <p>Manage registration bypass codes from <strong>Admin → Bypass Codes</strong>.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Create codes</strong> — Generate codes that allow registration without ZIP code verification.</li>
          <li><strong>Set limits</strong> — Configure max uses and expiration dates.</li>
          <li><strong>Track usage</strong> — Monitor how many times each code has been used.</li>
          <li><strong>Deactivate</strong> — Toggle codes active/inactive as needed.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "settings",
    icon: Settings,
    title: "App Settings & Page Appearance",
    content: (
      <div className="space-y-3">
        <p>Configure global settings from <strong>Admin → Settings</strong>.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>App settings</strong> — Key-value configuration pairs for platform-wide behavior.</li>
          <li><strong>Page backgrounds</strong> — Set custom background images and opacity for any managed page.</li>
          <li><strong>Page heroes</strong> — Configure hero images, titles, and subtitles for pages that support them.</li>
        </ul>
        <p className="text-muted-foreground text-sm">Changes to page appearance take effect immediately for all users.</p>
      </div>
    ),
  },
];

const AdminGuide = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          Admin & Manager Guide
        </h1>
        <p className="text-muted-foreground mt-1">
          Reference documentation for platform administrators and tenant managers.
        </p>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {sections.map((section) => (
          <AccordionItem
            key={section.id}
            value={section.id}
            className="border border-border rounded-lg px-4 bg-card/50"
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
    </div>
  );
};

export default AdminGuide;
