import { useState, useMemo, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Shield,
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  MapPin,
  Database,
  Plug,
  Megaphone,
  Image,
  UserCog,
  Settings,
  Bell,
  Search,
  Printer,
  ArrowUp,
  KeyRound,
  FileText,
  CreditCard,
  Cloud,
} from "lucide-react";

const sectionData: { id: string; icon: typeof Shield; title: string; bullets: string[] }[] = [
  {
    id: "roles",
    icon: Shield,
    title: "Roles & Permissions",
    bullets: [
      "The Tenant Portal supports three roles: Admin, Manager, and Marketing.",
      "Admin — Full access to all features including ZIP codes, subscribers, integrations, team management, codes, web pages, and settings.",
      "Manager — Access to Dashboard, Player Directory, Leads, Events, Marketing campaigns, ZIP Codes, Subscribers, Integrations (NISC, GLDS, Smarty), and Settings. Cannot manage codes, web pages, or team members.",
      "Marketing — Access to Marketing campaigns, My Assets, Web Pages, and read-only visibility of Tenant Codes. Ideal for team members focused on promotional content.",
      "Role Assignment — Admins invite team members by display name or email and assign roles from the Team page.",
    ],
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    bullets: [
      "The Dashboard provides a quick snapshot of your tenant's activity.",
      "Quick Stats — See Total Players, Subscribers, New Leads, and ZIP Codes Covered at a glance.",
      "Recent Activity — View the latest lead activity and event updates.",
      "Quick Links — Jump directly to any tenant function from the dashboard cards.",
    ],
  },
  {
    id: "players",
    icon: Users,
    title: "Player Directory",
    bullets: [
      "Navigate to Players to view a unified directory of all players associated with your service area.",
      "Two Sources — The directory aggregates new registered players (from leads) and historical legacy records imported by admins.",
      "Source Tagging — Each row is tagged as 'New' (registered through the platform) or 'Legacy' (imported historical record).",
      "Matched Status — Legacy records that have been matched to a registered account show a linked indicator.",
      "Search — Use the search bar to filter players by name, email, or username.",
      "Data Isolation — You only see players associated with your specific provider/tenant, enforced by backend security policies.",
    ],
  },
  {
    id: "leads",
    icon: UserCheck,
    title: "Leads",
    bullets: [
      "Navigate to Leads to manage users who registered with a ZIP code in your service area.",
      "Auto-Matching — When a player signs up with a ZIP code covered by your tenant, they automatically appear as a lead.",
      "Status Flow — Leads move through three statuses: New → Contacted → Converted.",
      "Status Updates — Click the status badge on any lead to update it. Use this to track your outreach progress.",
      "Filtering — Filter leads by status to focus on new prospects or track conversion rates.",
      "Tip: Regularly review new leads and update their status to keep your pipeline accurate.",
    ],
  },
  {
    id: "events",
    icon: Calendar,
    title: "Events",
    bullets: [
      "Navigate to Events to create and manage tenant-specific tournaments and events.",
      "Creating — Set name, game, format, date/time, max participants, description, rules, prize configuration, participation points, and hero image from the Media Library.",
      "Multi-Date Scheduling — Create multiple event instances from a single dialog using the multi-date calendar picker with time pickers. Each date generates a separate event.",
      "Prize Modes — Choose between 'None', 'Physical Prize' (linked to a Prize Shop item), or 'Value' (configurable percentage split for top finishers, default 50/30/20).",
      "Participation Points — Configure points awarded to all participants regardless of placement.",
      "Discord Role Assignment — Optionally assign a specific Discord role to players upon event registration.",
      "Request Moderator — Admins and Marketing staff can request a platform moderator for an event, which sends an automated email to support with event details.",
      "Hero Images — Upload or select a hero image to make your event visually appealing on public pages.",
      "Status Flow — Events move through: Draft → Published → In Progress → Completed (or Cancelled).",
      "Public Pages — Published events appear on your public event page at /events/your-tenant-slug, accessible without login.",
      "Registration — Players can register for published events. Toggle registration open/closed as needed.",
      "Marketing Assets — Attach promotional materials from your My Assets collection directly to events.",
      "Social Copy — Add pre-written social media copy to events for easy sharing by your team.",
      "Editing — Update any event detail at any time. Changes to published events are reflected immediately on the public page.",
      "Tenant Branding — Public event pages automatically apply your logo and brand colors (via CSS variables) for a professional, branded appearance.",
    ],
  },
  {
    id: "zip-codes",
    icon: MapPin,
    title: "ZIP Codes (Admin Only)",
    bullets: [
      "Navigate to ZIP Codes to manage your tenant's service area.",
      "Adding — Enter ZIP codes individually or in bulk to define your coverage area.",
      "Auto-Lead Generation — Any player who registers with a ZIP code in your list is automatically captured as a lead.",
      "City/State Info — ZIP codes are enriched with city, county, and state information from the national database.",
      "Removing — Remove ZIP codes that are no longer in your service area. Existing leads from removed ZIPs are preserved.",
      "Admin Only — Only tenant admins can manage ZIP codes. Managers and marketing users cannot access this page.",
    ],
  },
  {
    id: "subscribers",
    icon: Database,
    title: "Subscribers",
    bullets: [
      "Navigate to Subscribers to manage your subscriber/customer list.",
      "Manual Entry — Add subscribers one at a time with name, email, and account number.",
      "CSV Upload — Bulk import subscribers via CSV file. The uploader validates and previews data before import.",
      "Search — Use the search bar to find subscribers by name, email, or account number.",
      "Pagination — Large subscriber lists are paginated for performance.",
      "Status Tracking — Track subscriber status (active, inactive) for your records.",
      "Admin Only — Only tenant admins can manage subscribers.",
    ],
  },
  {
    id: "integrations",
    icon: Plug,
    title: "Integrations (Admin Only)",
    bullets: [
      "Navigate to Subscribers → Integrations tab to connect billing system integrations.",
      "Supported Providers — NISC and GLDS billing systems are currently supported.",
      "Setup — Enter your API URL and credentials via the configuration dialog. Credentials are encrypted at rest.",
      "Test Connection — Use the 'Test Connection' button to verify your credentials before saving.",
      "Sync Now — Trigger a full subscriber synchronization on demand from the integration card.",
      "Sync History — View a detailed log of all sync attempts with status, record counts, and error messages.",
      "History Filtering — Filter sync history by provider, status (success/error), and date range.",
      "Pagination — Sync history is paginated (15 records per page) for large datasets.",
      "CSV Export — Export filtered sync history to CSV for reporting.",
      "Auto-Refresh — Sync history updates in real-time as new syncs complete.",
      "Disconnect — Safely remove integration credentials while preserving previously synced data.",
      "Admin Only — Only tenant admins can manage integrations.",
    ],
  },
  {
    id: "tenant-codes",
    icon: KeyRound,
    title: "Tenant Codes",
    bullets: [
      "Navigate to Marketing → Codes tab to manage tenant-scoped registration and tracking codes.",
      "Code Types — Five code types are available: Campaign (promotional tracking), Override (requires manual review), Access (grants immediate platform entry), Tracking (analytics only), and Verification (identity verification required).",
      "Creating — Set a unique code string, type, optional description, usage limit, and expiration date. Codes are automatically uppercased.",
      "Campaign & Event Linking — Optionally link codes to specific marketing campaigns or tenant events for scoped tracking and attribution.",
      "Usage Limits — Set maximum uses per code. The system tracks usage counts automatically and prevents redemption beyond the limit.",
      "Expiration — Set optional expiry dates. Expired codes are automatically rejected during validation.",
      "Access vs Override/Verification — 'Access' codes grant immediate platform entry during registration. 'Override' and 'Verification' codes signal that users require manual review and approval from the tenant before full access is granted.",
      "Activate/Deactivate — Toggle codes active or inactive without deleting them.",
      "Delete — Remove codes permanently when no longer needed.",
      "Permissions — Tenant Admins have full create, edit, and delete access. Marketing users can view codes but cannot modify them.",
    ],
  },
  {
    id: "marketing",
    icon: Megaphone,
    title: "Marketing",
    bullets: [
      "Navigate to Marketing to browse platform-wide marketing campaigns and resources.",
      "Tabbed Layout — The Marketing page consolidates four tabs: Campaigns, My Assets, Codes, and Web Pages for centralized management.",
      "Campaign Library — View all published marketing campaigns with descriptions and downloadable assets.",
      "Category Filter — Filter campaigns by category (e.g., social media, email, print) to find relevant materials.",
      "Asset Downloads — Download campaign assets (images, banners, templates) for use in your local marketing.",
      "Campaign Details — Click into any campaign to see full details, social copy, and all associated assets.",
      "Calendar Embeds — Publish branded calendar embed widgets showing your tenant's events for use on external websites.",
      "'From Event' Promo Picker — Quickly generate promotional assets by selecting an existing event. Event data (name, date, game, hero image) is auto-mapped to design overlays.",
      "Asset Editor — Create custom promotional materials using the built-in Canvas-based design tool with social media format presets.",
      "Quick Create (⚡) — Instantly generate promotional assets from tournament or challenge data in a streamlined one-click flow.",
      "Full Edit (✏️) — Open the full Canvas Editor for detailed design work with layers, shapes, and text.",
    ],
  },
  {
    id: "assets",
    icon: Image,
    title: "My Assets",
    bullets: [
      "Navigate to My Assets (via Marketing → My Assets tab) to manage your tenant-specific marketing materials.",
      "Upload — Upload images, banners, and promotional materials to your private asset library.",
      "Organization — Assets are stored per-tenant and are only visible to your team members.",
      "Event Integration — Assets uploaded here can be attached to your tenant events as promotional materials.",
      "Asset Editor — Open the Canvas-based design editor to create custom promotional graphics with layers, shapes, and text overlays.",
      "Social Media Presets — The Asset Editor includes format presets for Instagram, Facebook, Twitter, and other social platforms, ensuring correct dimensions for each channel.",
      "Format Badges — Asset cards display visual badges indicating which social media format preset was used.",
      "File Management — View, download, or delete assets as needed.",
      "Supported Formats — Upload images in common formats (JPG, PNG, WebP, GIF).",
    ],
  },
  {
    id: "web-pages",
    icon: FileText,
    title: "Web Pages",
    bullets: [
      "Navigate to Marketing → Web Pages tab to create and manage promotional landing pages.",
      "Page Builder — Compose pages using a block-based editor with seven section types: Hero, Text Block (Markdown), Image Gallery, CTA, Embed Widget, Banner, and Video.",
      "Media Integration — Select images from the Media Library for Hero backgrounds, Image Galleries, and Banner sections. Categories are filtered to relevant types (gaming_web_page, cta, logo).",
      "Public Hosting — Published pages are accessible at /pages/:tenantSlug/:pageSlug. No login required for visitors.",
      "Tenant Branding — Pages automatically apply your tenant's logo and brand color accents for a professional, on-brand appearance.",
      "HTML Export — Export any page as a standalone, self-contained HTML file with inline CSS and embedded media for hosting on your own website.",
      "Editing — Add, reorder, and remove sections at any time. Changes are saved and reflected immediately on the public page.",
      "Permissions — Tenant Admins and Marketing users can create and manage web pages. Managers cannot access this feature.",
    ],
  },
  {
    id: "team",
    icon: UserCog,
    title: "Team Management (Admin Only)",
    bullets: [
      "Navigate to Team to manage who has access to your tenant portal.",
      "Invite Members — Search for existing platform users by display name and invite them to your team.",
      "Email Invitations — Invite new team members by email before they've registered an account. Invitations are automatically claimed when the invited user signs up via a database trigger.",
      "Role Assignment — Assign each team member a role: Manager or Marketing.",
      "Role Changes — Update a team member's role at any time from the team list.",
      "Remove Members — Remove team members who no longer need access. This revokes their portal access immediately.",
      "Admin Only — Only tenant admins can manage the team. Managers and marketing users can see their own role but cannot modify the team.",
    ],
  },
  {
    id: "settings",
    icon: Settings,
    title: "Settings (Admin Only)",
    bullets: [
      "Navigate to Settings to customize your tenant's branding and contact information.",
      "Logo — Upload your organization's logo. It appears in the sidebar, on public event pages, and in calendar embeds.",
      "Contact Email — Set the primary contact email displayed on your public-facing pages.",
      "Brand Colors — Configure primary and accent colors to customize the look of your public event pages and embeds.",
      "Live Preview — Brand color changes are reflected immediately across your tenant's public presence.",
      "Subscriber Validation — Optionally require subscriber identity validation during registration. When enabled, users must verify their name and account number against your subscriber registry before gaining access.",
      "Admin Only — Only tenant admins can modify settings.",
    ],
  },
  {
    id: "billing",
    icon: CreditCard,
    title: "Billing & Subscription (Admin Only)",
    bullets: [
      "Navigate to Settings to view and manage your tenant's billing and subscription status.",
      "Billing Card — The Billing card at the top of Settings shows your current plan, status, and renewal date.",
      "Subscribe — If you don't have an active subscription, click 'Subscribe' to start a Stripe checkout for the Tenant Basic plan ($850/mo).",
      "Manage Subscription — Active subscribers can click 'Manage Subscription' to open the Stripe Customer Portal where you can update payment methods, view invoices, or cancel.",
      "Status Indicators — Your subscription status is shown as a badge: Active (green), Trial, Past Due (warning), Canceled, or Inactive.",
      "Checkout Flow — After completing Stripe checkout, you'll be redirected back to Settings with a confirmation message.",
      "Auto-Sync — Subscription status is automatically synchronized via Stripe webhooks. Changes to your billing (upgrades, cancellations, payment failures) are reflected in real time.",
      "Admin Only — Only tenant admins can manage billing and subscriptions.",
    ],
  },
  {
    id: "cloud-gaming",
    icon: Cloud,
    title: "Cloud Gaming Seats (Admin Only)",
    bullets: [
      "Navigate to Settings → Cloud Gaming to manage cloud-based gaming access for your subscribers.",
      "Enable Cloud Gaming — Toggle cloud gaming on/off from the Cloud Gaming configuration card. When enabled, the Seats management card appears below.",
      "Subscription Tiers — Choose a tier (Basic up to 25 seats, Standard up to 100, Premium unlimited) and set the max seat count.",
      "Assign Seats — Select a subscriber from the dropdown picker and click 'Assign' to grant them a cloud gaming seat. Each seat assignment triggers a Stripe checkout ($29.99/mo per seat).",
      "Capacity Bar — A visual progress bar shows how many of your allocated seats are currently in use.",
      "Seat Table — View all assigned seats with subscriber name, email, billing status (Active, Pending, Tracked), and assignment date.",
      "Revoke Seats — Click the revoke button on any seat to deactivate it. A confirmation dialog prevents accidental removals. Note: Stripe subscriptions should be canceled separately via the billing portal.",
      "Pending Integration — Cloud gaming seats are currently tracked locally. Blacknut account provisioning will be enabled when the API integration is configured.",
      "Auto-Sync — When a cloud gaming seat's Stripe subscription is canceled, the seat is automatically deactivated via webhook sync.",
      "Admin Only — Only tenant admins can manage cloud gaming settings and seat assignments.",
    ],
  },
  {
    id: "game-servers",
    icon: Plug,
    title: "Game Servers",
    bullets: [
      "The platform hosts a public Game Server Directory at /servers (or /game-servers) where players can find dedicated servers for supported games.",
      "Event Promotion — When creating tenant events, reference specific game servers in the event description to guide players on where to practice or compete.",
      "Live Status — Server cards show real-time online/offline status, IP addresses, and player capacity so your community knows which servers are available.",
      "No Management Required — Game servers are managed by platform admins. Tenants benefit from the directory as a resource for their community events.",
      "Tip: Include the server name and IP in your event descriptions to make it easy for participants to find the right server.",
    ],
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Notifications",
    bullets: [
      "The platform generates automatic notifications for key tenant activities — no manual action needed.",
      "New Lead — When a player registers with a ZIP code in your service area, tenant admins and managers are notified.",
      "Event Registration — When a player registers for one of your events, the event creator is notified.",
      "Sync Completion — After a billing system sync completes (success or error), the triggering admin is notified.",
      "Tip: Notifications appear in-app via the bell icon. Key events may also trigger email alerts based on your notification preferences.",
    ],
  },
];

const TenantGuide = () => {
  const [search, setSearch] = useState("");
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sectionData;
    const q = search.toLowerCase();
    return sectionData.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.bullets.some((b) => b.toLowerCase().includes(q))
    );
  }, [search]);

  const handlePrint = () => {
    const sectionBlocks = sectionData
      .map((s) => {
        const items = s.bullets.map((b) => `<li>${b}</li>`).join("");
        return `<div class="section"><h2>${s.title}</h2><ul>${items}</ul></div>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tenant Admin Guide</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;padding:40px;max-width:900px;margin:auto;font-size:13px}
  h1{font-size:24px;margin-bottom:2px} h2{font-size:16px;margin-top:24px;border-bottom:2px solid #0cc;padding-bottom:4px}
  .section{page-break-inside:avoid;margin-bottom:16px}
  ul{padding-left:20px;margin:4px 0} li{margin:4px 0}
  @media print{body{padding:20px}}
</style></head><body>
<h1>Tenant Admin Guide</h1>
<p style="color:#888;font-size:12px">Reference documentation for tenant administrators, managers, and marketing users.</p>
${sectionBlocks}
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Tenant Guide
          </h1>
          <p className="text-muted-foreground mt-1">
            Reference documentation for tenant administrators, managers, and marketing users.
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
                <ul className="list-disc pl-5 space-y-2">
                  {section.bullets.map((b, i) => {
                    const dashIdx = b.indexOf(" — ");
                    if (dashIdx > 0) {
                      return (
                        <li key={i}>
                          <strong className="text-foreground">{b.slice(0, dashIdx)}</strong>
                          {" — "}{b.slice(dashIdx + 3)}
                        </li>
                      );
                    }
                    return <li key={i}>{b}</li>;
                  })}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="text-muted-foreground text-sm text-center py-8">No results found for &ldquo;{search}&rdquo;</p>
      )}

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

export default TenantGuide;
