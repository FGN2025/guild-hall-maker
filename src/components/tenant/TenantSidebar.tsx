import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, MapPin, Users, ArrowLeft, Database, ExternalLink } from "lucide-react";

interface TenantSidebarProps {
  tenantName: string;
}

const sidebarItems = [
  { to: "/tenant", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tenant/leads", label: "Leads", icon: Users },
  { to: "/tenant/zip-codes", label: "ZIP Codes", icon: MapPin },
  { to: "/tenant/subscribers", label: "Subscribers", icon: Database },
];

const ecosystemLinks = [
  { href: "https://manage.fgn.gg", label: "Manage" },
  { href: "https://hub.fgn.gg", label: "Hub" },
];

const TenantSidebar = ({ tenantName }: TenantSidebarProps) => {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-heading mb-1">
          Tenant Admin
        </p>
        <h2 className="font-display text-lg font-bold text-primary tracking-wider truncate">
          {tenantName}
        </h2>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-1">
        {sidebarItems.map((item) => {
          const active =
            item.to === "/tenant"
              ? location.pathname === "/tenant"
              : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-heading font-medium tracking-wide transition-all ${
                active
                  ? "text-primary bg-primary/10 border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
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
        {ecosystemLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-heading font-medium tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <ExternalLink className="h-4 w-4" />
            {link.label}
          </a>
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
