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
} from "lucide-react";

const sectionData: { id: string; icon: typeof Shield; title: string; bullets: string[] }[] = [
  {
    id: "roles",
    icon: Shield,
    title: "Roles & Permissions",
    bullets: [
      "The Tenant Portal supports three roles: Admin, Manager, and Marketing.",
      "Admin — Full access to all features including ZIP codes, subscribers, integrations, team management, and settings.",
      "Manager — Access to Dashboard, Player Directory, Leads, Events, and Marketing. Cannot manage ZIP codes, subscribers, integrations, team, or settings.",
      "Marketing — Access to Marketing campaigns and My Assets only. Ideal for team members focused on promotional content.",
      "Role Assignment — Admins invite team members by display name and assign roles from the Team page.",
    ],
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    bullets: [
      "The Dashboard provides a quick snapshot of your tenant's activity.",
      "Quick Stats — See total leads, new leads, converted leads, and ZIP codes covered at a glance.",
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
      "Creating — Set name, game, format, date/time, max participants, description, rules, prize pool, and hero image.",
      "Hero Images — Upload or select a hero image to make your event visually appealing on public pages.",
      "Status Flow — Events move through: Draft → Published → In Progress → Completed (or Cancelled).",
      "Public Pages — Published events appear on your public event page at /events/your-tenant-slug, accessible without login.",
      "Registration — Players can register for published events. Toggle registration open/closed as needed.",
      "Marketing Assets — Attach promotional materials from your My Assets collection directly to events.",
      "Social Copy — Add pre-written social media copy to events for easy sharing by your team.",
      "Editing — Update any event detail at any time. Changes to published events are reflected immediately on the public page.",
      "Tenant Branding — Public event pages automatically apply your logo and brand colors for a professional, branded appearance.",
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
    id: "marketing",
    icon: Megaphone,
    title: "Marketing",
    bullets: [
      "Navigate to Marketing to browse platform-wide marketing campaigns and resources.",
      "Campaign Library — View all published marketing campaigns with descriptions and downloadable assets.",
      "Category Filter — Filter campaigns by category (e.g., social media, email, print) to find relevant materials.",
      "Asset Downloads — Download campaign assets (images, banners, templates) for use in your local marketing.",
      "Campaign Details — Click into any campaign to see full details, social copy, and all associated assets.",
      "Calendar Embeds — Publish branded calendar embed widgets showing your tenant's events for use on external websites.",
    ],
  },
  {
    id: "assets",
    icon: Image,
    title: "My Assets",
    bullets: [
      "Navigate to My Assets to manage your tenant-specific marketing materials.",
      "Upload — Upload images, banners, and promotional materials to your private asset library.",
      "Organization — Assets are stored per-tenant and are only visible to your team members.",
      "Event Integration — Assets uploaded here can be attached to your tenant events as promotional materials.",
      "File Management — View, download, or delete assets as needed.",
      "Supported Formats — Upload images in common formats (JPG, PNG, WebP, GIF).",
    ],
  },
  {
    id: "team",
    icon: UserCog,
    title: "Team Management (Admin Only)",
    bullets: [
      "Navigate to Team to manage who has access to your tenant portal.",
      "Invite Members — Search for existing platform users by display name and invite them to your team.",
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
      "Admin Only — Only tenant admins can modify settings.",
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
