import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Image, Users, Trophy, ArrowLeft, KeyRound, Building2, Settings, Gamepad2, BookOpen, Calendar, Award, Megaphone, UserCheck, Archive, Globe, Target, ShieldCheck } from "lucide-react";

const sidebarItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/admin/challenges", label: "Challenges", icon: Target },
  { to: "/admin/games", label: "Games", icon: Gamepad2 },
  { to: "/admin/seasons", label: "Seasons", icon: Calendar },
  { to: "/admin/achievements", label: "Achievements", icon: Award },
  { to: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { to: "/admin/media", label: "Media Library", icon: Image },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/access-requests", label: "Access Requests", icon: UserCheck },
  { to: "/admin/discord-bypass", label: "Discord Bypass", icon: ShieldCheck },
  { to: "/admin/bypass-codes", label: "Bypass Codes", icon: KeyRound },
  { to: "/admin/ecosystem", label: "Ecosystem", icon: Globe },
  { to: "/admin/tenants", label: "Tenants", icon: Building2 },
  { to: "/admin/notebooks", label: "Notebooks", icon: BookOpen },
  { to: "/admin/legacy-users", label: "Legacy Import", icon: Archive },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/guide", label: "Admin Guide", icon: BookOpen },
];

const AdminSidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h2 className="font-display text-lg font-bold text-primary tracking-wider">Admin Dashboard</h2>
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

export default AdminSidebar;
