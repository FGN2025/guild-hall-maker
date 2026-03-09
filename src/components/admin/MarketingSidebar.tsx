import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Image, ArrowLeft, BookOpen } from "lucide-react";

const sidebarItems = [
  { to: "/admin/marketing", label: "Campaigns", icon: LayoutDashboard },
  { to: "/admin/media", label: "Media Library", icon: Image },
  { to: "/admin/guide", label: "Marketing Guide", icon: BookOpen },
];

const MarketingSidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 h-full bg-card border-r border-border flex flex-col overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="font-display text-lg font-bold text-primary tracking-wider">Marketing Dashboard</h2>
        <Link
          to="/dashboard"
          className="flex items-center gap-2 mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors font-heading"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Link>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
        {sidebarItems.map((item) => {
          const active = location.pathname === item.to;
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

export default MarketingSidebar;
