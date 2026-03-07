import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, MapPin, Users, ArrowLeft, Database, ExternalLink, Loader2, UserCog, Plug, Settings, Megaphone, Image as ImageIcon, Calendar, BookOpen, KeyRound, ChevronDown, ShieldCheck } from "lucide-react";
import { useEcosystemAuth } from "@/hooks/useEcosystemAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Convert hex color to rgba string */
function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return hex;
  const [r, g, b] = m.map((c) => parseInt(c, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
}

export interface TenantSidebarProps {
  tenantName: string;
  tenantRole: 'admin' | 'manager' | 'marketing';
  logoUrl?: string | null;
  brandColor?: string;
  isPlatformAdmin?: boolean;
  allTenants?: TenantListItem[];
  selectedTenantId?: string | null;
  onTenantChange?: (id: string | null) => void;
}

const allSidebarItems = [
  { to: "/tenant", label: "Dashboard", icon: LayoutDashboard, roles: ['admin', 'manager'] },
  { to: "/tenant/players", label: "Players", icon: Users, roles: ['admin', 'manager'] },
  { to: "/tenant/leads", label: "Leads", icon: Users, roles: ['admin', 'manager'] },
  { to: "/tenant/events", label: "Events", icon: Calendar, roles: ['admin', 'manager'] },
  { to: "/tenant/zip-codes", label: "ZIP Codes", icon: MapPin, roles: ['admin'] },
  { to: "/tenant/subscribers", label: "Subscribers", icon: Database, roles: ['admin'] },
  { to: "/tenant/subscribers?tab=integrations", label: "Integrations", icon: Plug, roles: ['admin'] },
  { to: "/tenant/marketing", label: "Marketing", icon: Megaphone, roles: ['admin', 'manager', 'marketing'] },
  { to: "/tenant/marketing/assets", label: "My Assets", icon: ImageIcon, roles: ['admin', 'marketing'] },
  { to: "/tenant/codes", label: "Codes", icon: KeyRound, roles: ['admin', 'marketing'] },
  { to: "/tenant/team", label: "Team", icon: UserCog, roles: ['admin'] },
  { to: "/tenant/settings", label: "Settings", icon: Settings, roles: ['admin'] },
  { to: "/tenant/guide", label: "Guide", icon: BookOpen, roles: ['admin', 'manager', 'marketing'] },
];

const ecosystemApps = [
  { target: "play" as const, label: "Play" },
  { target: "manage" as const, label: "Manage" },
  { target: "hub" as const, label: "Hub" },
];

const TenantSidebar = ({ tenantName, tenantRole, logoUrl, brandColor, isPlatformAdmin, allTenants, selectedTenantId, onTenantChange }: TenantSidebarProps) => {
  const location = useLocation();
  const { requestMagicLink, loading } = useEcosystemAuth();

  const sidebarItems = allSidebarItems.filter((item) => item.roles.includes(tenantRole));

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        {/* Access mode indicator */}
        <div className={`flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-md ${
          isPlatformAdmin
            ? "bg-primary/10 border border-primary/20"
            : "bg-accent/50 border border-border"
        }`}>
          {isPlatformAdmin ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[10px] uppercase tracking-widest font-heading text-primary font-semibold">Viewing as Platform Admin</span>
            </>
          ) : (
            <>
              <UserCog className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-[10px] uppercase tracking-widest font-heading text-muted-foreground font-semibold">
                {tenantRole === 'admin' ? 'Tenant Admin' : tenantRole === 'manager' ? 'Tenant Manager' : 'Tenant Marketing'}
              </span>
            </>
          )}
        </div>

        {/* Tenant switcher for platform admins */}
        {isPlatformAdmin && allTenants && allTenants.length > 1 && onTenantChange ? (
          <Select value={selectedTenantId || undefined} onValueChange={(val) => onTenantChange(val)}>
            <SelectTrigger className="w-full mb-2 text-sm font-heading font-bold">
              <SelectValue placeholder="Select tenant" />
            </SelectTrigger>
            <SelectContent>
              {allTenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt="" className="h-4 w-4 rounded object-contain" />
                    ) : (
                      <span className="h-4 w-4 rounded bg-muted flex items-center justify-center text-[9px] font-bold">{t.name.charAt(0)}</span>
                    )}
                    <span>{t.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={tenantName} className="h-10 w-10 rounded-lg object-contain shrink-0" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <span className="font-display text-sm font-bold text-primary">{tenantName.charAt(0)}</span>
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold tracking-wider truncate" style={brandColor ? { color: brandColor } : undefined}>
                {tenantName}
              </h2>
            </div>
          </div>
        )}
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-1">
        {sidebarItems.map((item) => {
          const isIntegrationsLink = item.to.includes("?tab=integrations");
          const currentSearch = location.search;
          const active = item.to === "/tenant"
            ? location.pathname === "/tenant"
            : isIntegrationsLink
              ? location.pathname === "/tenant/subscribers" && currentSearch.includes("tab=integrations")
              : item.to === "/tenant/subscribers"
                ? location.pathname === "/tenant/subscribers" && !currentSearch.includes("tab=integrations")
                : location.pathname.startsWith(item.to);

          const activeStyle = active && brandColor
            ? { color: brandColor, backgroundColor: hexToRgba(brandColor, 0.1), borderColor: hexToRgba(brandColor, 0.3) }
            : undefined;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-heading font-medium tracking-wide transition-all ${
                active
                  ? "text-primary bg-primary/10 border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              style={activeStyle}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-6 mb-2 px-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-heading">
            FGN Ecosystem
          </p>
        </div>
        {ecosystemApps.map((app) => (
          <button
            key={app.target}
            onClick={() => requestMagicLink(app.target)}
            disabled={loading !== null}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-heading font-medium tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-50 w-full text-left"
          >
            {loading === app.target ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            {app.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-border">
        <Link
          to={isPlatformAdmin ? "/admin" : "/dashboard"}
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-heading"
        >
          <ArrowLeft className="h-4 w-4" />
          {isPlatformAdmin ? "Back to Admin" : "Back to App"}
        </Link>
      </div>
    </aside>
  );
};

export default TenantSidebar;
