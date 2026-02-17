import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
const sectionData: { id: string; icon: typeof Shield; title: string; bullets: string[] }[] = [
  {
    id: "overview",
    icon: Shield,
    title: "Admin vs Manager Roles",
    bullets: [
      "Super Admin / Admin — Full access to the Admin Panel, all settings, user management, tournament control, badge awarding, tenant configuration, and ecosystem tools.",
      "Tenant Manager — Scoped access within a specific Tenant portal. Managers can view leads and the tenant dashboard but cannot manage ZIP codes, subscribers, or team settings.",
      "Roles are assigned via the Admin → Users panel or Tenant → Team page. A user can hold both an app-level role and a tenant role simultaneously.",
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
      "Tip: Only Super Admins can promote other users to Admin.",
    ],
  },
  {
    id: "tournament-management",
    icon: Trophy,
    title: "Tournament Management",
    bullets: [
      "Full control over the tournament lifecycle from Admin → Tournaments.",
      "Creating: Set name, game, format, date/time, max participants, description, rules, prize pool, entry fee, and hero image.",
      "Managing Registrations: View registered players, change status (Upcoming → Open → In Progress → Completed).",
      "Bracket & Scoring: Generate single-elimination bracket, enter match scores, winners advance automatically, season points awarded on completion.",
    ],
  },
  {
    id: "badge-awarding",
    icon: Award,
    title: "Badge & Achievement Awarding",
    bullets: [
      "Manage achievements from Admin → Achievements.",
      "Creating Badges: Define name, description, icon, category, tier (Bronze/Silver/Gold/Platinum), optional auto-criteria, display order.",
      "Manual Awarding: Award any badge from a player's profile or achievements admin page with optional notes.",
      "Tip: Use tiers for progression paths — e.g. 'Tournament Veteran' at Bronze (5), Silver (15), Gold (50), Platinum (100).",
    ],
  },
  {
    id: "tenant-config",
    icon: Building2,
    title: "Tenant Configuration",
    bullets: [
      "Tenants represent Broadband Service Providers. Manage from Admin → Tenants.",
      "Creating: Set name, slug, contact email, optional logo. Tenants start active.",
      "Assigning Admins: Add users as Tenant Admins (full access) or Managers (leads & dashboards only).",
      "ZIP Code Coverage: Each tenant manages ZIP codes for their service area; player ZIP codes are matched during registration.",
    ],
  },
  {
    id: "tenant-portal",
    icon: BarChart3,
    title: "Tenant Portal (Manager View)",
    bullets: [
      "Access the Tenant Panel from the main sidebar.",
      "Dashboard — Overview of leads, subscribers, and key metrics.",
      "Leads — View and manage user service interests, update lead status.",
      "ZIP Codes (Admin only) — Add or remove coverage ZIP codes.",
      "Subscribers (Admin only) — View/manage subscriber records, CSV import.",
      "Team (Admin only) — Invite managers, update roles, remove members.",
    ],
  },
  {
    id: "games-management",
    icon: Gamepad2,
    title: "Games Management",
    bullets: [
      "Manage the game catalog from Admin → Games.",
      "Add games — Set name, slug, category, description, platform tags, cover image.",
      "Edit games — Update any field or toggle active/inactive.",
      "Guide content — Add game-specific markdown guides.",
      "Display order — Control sort order in the catalog.",
    ],
  },
  {
    id: "seasons",
    icon: Calendar,
    title: "Season Management",
    bullets: [
      "Seasons track competitive periods from Admin → Seasons.",
      "Create seasons — Define name, start date, end date.",
      "Status management — draft → active → completed.",
      "Points & rankings — Season scores accumulate from tournament results automatically.",
      "Rotation — Snapshots taken when season ends; new season can begin.",
    ],
  },
  {
    id: "media-library",
    icon: Image,
    title: "Media Library",
    bullets: [
      "Upload and manage images from Admin → Media Library.",
      "Upload — Drag-and-drop or browse.",
      "Categories & Tags — Organize for easy discovery.",
      "AI Generation — Generate images with built-in AI.",
      "Usage — Select for tournament images, game covers, page heroes, backgrounds.",
    ],
  },
  {
    id: "bypass-codes",
    icon: KeyRound,
    title: "Bypass Codes",
    bullets: [
      "Manage registration bypass codes from Admin → Bypass Codes.",
      "Create codes — Allow registration without ZIP verification.",
      "Set limits — Configure max uses and expiration dates.",
      "Track usage — Monitor usage count per code.",
      "Deactivate — Toggle codes active/inactive.",
    ],
  },
  {
    id: "settings",
    icon: Settings,
    title: "App Settings & Page Appearance",
    bullets: [
      "Configure global settings from Admin → Settings.",
      "App settings — Key-value config pairs for platform-wide behavior.",
      "Page backgrounds — Set custom background images and opacity.",
      "Page heroes — Configure hero images, titles, subtitles.",
      "Changes take effect immediately for all users.",
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
  { feature: "Admin Dashboard", admin: true, manager: false },
  { feature: "User Management", admin: true, manager: false },
  { feature: "Tournament Management", admin: true, manager: false },
  { feature: "Badge / Achievement Awarding", admin: true, manager: false },
  { feature: "Games Management", admin: true, manager: false },
  { feature: "Season Management", admin: true, manager: false },
  { feature: "Media Library", admin: true, manager: false },
  { feature: "Bypass Codes", admin: true, manager: false },
  { feature: "App Settings & Appearance", admin: true, manager: false },
  { feature: "Tenant Dashboard", admin: true, manager: true },
  { feature: "Tenant Leads", admin: true, manager: true },
  { feature: "Tenant ZIP Codes", admin: true, manager: false },
  { feature: "Tenant Subscribers", admin: true, manager: false },
  { feature: "Tenant Team Management", admin: true, manager: false },
];

const AdminGuide = () => {
  const [search, setSearch] = useState("");

  const handlePrint = () => {
    const permRows = permissionRows
      .map((r) => `<tr><td>${r.feature}</td><td style="text-align:center">${r.admin ? "✅" : "—"}</td><td style="text-align:center">${r.manager ? "✅" : "—"}</td></tr>`)
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
<table><thead><tr><th>Feature</th><th style="text-align:center">Admin</th><th style="text-align:center">Manager</th></tr></thead><tbody>${permRows}</tbody></table>
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
                <th className="text-center px-4 py-2 font-heading font-medium">Manager</th>
              </tr>
            </thead>
            <tbody>
              {filteredPermissions.map((row) => (
                <tr key={row.feature} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2">{row.feature}</td>
                  <td className="text-center px-4 py-2">{row.admin ? "✅" : "—"}</td>
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
    </div>
  );
};

export default AdminGuide;
