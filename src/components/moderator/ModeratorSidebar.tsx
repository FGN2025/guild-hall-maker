import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Trophy, Swords, Star, Gift, ArrowLeft, TrendingUp } from "lucide-react";

const sidebarItems = [
  { to: "/moderator", label: "Dashboard", icon: LayoutDashboard },
  { to: "/moderator/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/moderator/matches", label: "Matches", icon: Swords },
  { to: "/moderator/points", label: "Points", icon: Star },
  { to: "/moderator/ladders", label: "Ladders", icon: TrendingUp },
  { to: "/moderator/redemptions", label: "Redemptions", icon: Gift },
];

const ModeratorSidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h2 className="font-display text-lg font-bold text-primary tracking-wider">Moderator Panel</h2>
        <Link
          to="/dashboard"
          className="flex items-center gap-2 mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors font-heading"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Link>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-1">
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

export default ModeratorSidebar;
