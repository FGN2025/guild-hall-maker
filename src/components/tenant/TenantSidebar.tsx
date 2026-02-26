import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, MapPin, Users, ArrowLeft, Database, ExternalLink, Loader2, UserCog, Plug, Settings, Megaphone } from "lucide-react";
import { useEcosystemAuth } from "@/hooks/useEcosystemAuth";

/** Convert hex color to rgba string */
function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return hex;
  const [r, g, b] = m.map((c) => parseInt(c, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface TenantSidebarProps {
  tenantName: string;
  tenantRole: 'admin' | 'manager' | 'marketing';
  logoUrl?: string | null;
  brandColor?: string;
}

const allSidebarItems = [
  { to: "/tenant", label: "Dashboard", icon: LayoutDashboard, roles: ['admin', 'manager'] },
  { to: "/tenant/leads", label: "Leads", icon: Users, roles: ['admin', 'manager'] },
  { to: "/tenant/zip-codes", label: "ZIP Codes", icon: MapPin, roles: ['admin'] },
  { to: "/tenant/subscribers", label: "Subscribers", icon: Database, roles: ['admin'] },
  { to: "/tenant/subscribers?tab=integrations", label: "Integrations", icon: Plug, roles: ['admin'] },
  { to: "/tenant/marketing", label: "Marketing", icon: Megaphone, roles: ['admin', 'manager'] },
  { to: "/tenant/team", label: "Team", icon: UserCog, roles: ['admin'] },
  { to: "/tenant/settings", label: "Settings", icon: Settings, roles: ['admin'] },
];

const ecosystemApps = [
  { target: "play" as const, label: "Play" },
  { target: "manage" as const, label: "Manage" },
  { target: "hub" as const, label: "Hub" },
];

const TenantSidebar = ({ tenantName, tenantRole, logoUrl, brandColor }: TenantSidebarProps) => {
  const location = useLocation();
  const { requestMagicLink, loading } = useEcosystemAuth();

  const sidebarItems = allSidebarItems.filter((item) => item.roles.includes(tenantRole));

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt={tenantName} className="h-10 w-10 rounded-lg object-contain shrink-0" />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <span className="font-display text-sm font-bold text-primary">{tenantName.charAt(0)}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-heading mb-0.5">
            Tenant Admin
          </p>
          <h2 className="font-display text-sm font-bold tracking-wider truncate" style={brandColor ? { color: brandColor } : undefined}>
            {tenantName}
          </h2>
        </div>
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
          to="/dashboard"
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-heading"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Link>
      </div>
    </aside>
  );
};

export default TenantSidebar;
