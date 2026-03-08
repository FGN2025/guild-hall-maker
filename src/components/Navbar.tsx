import { Link, useLocation, useNavigate } from "react-router-dom";
import { Trophy, LayoutDashboard, Users, Shield, Gamepad2, Menu, X, LogOut, Settings, BarChart3, Swords, Award, ShieldCheck, Building2, CalendarDays, Target, Gift, SwordIcon, BookOpen } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";

const navItems = [
  { to: "/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/community", label: "Community", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: Shield },
  { to: "/season-stats", label: "Stats", icon: BarChart3 },
  { to: "/compare", label: "Compare", icon: Swords },
  { to: "/achievements", label: "Badges", icon: Award },
  { to: "/challenges", label: "Challenges", icon: Target },
  { to: "/prize-shop", label: "Prize Shop", icon: Gift },
  { to: "/ladders", label: "Ladders", icon: SwordIcon },
  { to: "/guide", label: "Player Guide", icon: BookOpen },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const { isTenantAdmin } = useTenantAdmin();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <Gamepad2 className="h-7 w-7 text-primary" />
          <span className="font-display text-xl font-bold tracking-wider text-foreground group-hover:text-primary transition-colors">
            FGN
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-heading font-medium tracking-wide transition-all ${
                  active
                    ? "text-primary bg-primary/10 neon-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-heading font-medium tracking-wide transition-all ${
                location.pathname.startsWith("/admin")
                  ? "text-primary bg-primary/10 neon-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          )}
          {isTenantAdmin && (
            <Link
              to="/tenant"
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-heading font-medium tracking-wide transition-all ${
                location.pathname.startsWith("/tenant")
                  ? "text-primary bg-primary/10 neon-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Building2 className="h-4 w-4" />
              Tenant
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/profile">
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-heading tracking-wide text-muted-foreground hover:text-foreground gap-1"
                >
                  <Settings className="h-4 w-4" /> Profile
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="font-heading tracking-wide text-muted-foreground hover:text-foreground gap-1"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="font-heading tracking-wide text-muted-foreground hover:text-foreground">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90">
                  Join Now
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden glass-panel border-t border-border/50 animate-slide-up">
          <div className="flex flex-col p-4 gap-2">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md font-heading font-medium tracking-wide transition-all ${
                    active
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-md font-heading font-medium tracking-wide transition-all ${
                  location.pathname.startsWith("/admin")
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <ShieldCheck className="h-5 w-5" />
                Admin
              </Link>
            )}
            {(isModerator || isAdmin) && (
              <Link
                to="/moderator"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-md font-heading font-medium tracking-wide transition-all ${
                  location.pathname.startsWith("/moderator")
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <SwordIcon className="h-5 w-5" />
                Moderator
              </Link>
            )}
            {isTenantAdmin && (
              <Link
                to="/tenant"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-md font-heading font-medium tracking-wide transition-all ${
                  location.pathname.startsWith("/tenant")
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Building2 className="h-5 w-5" />
                Tenant
              </Link>
            )}
            <div className="flex gap-2 pt-2 border-t border-border/50 mt-2">
              {user ? (
                <div className="flex flex-col gap-2">
                  <Link to="/profile" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full font-heading gap-1">
                      <Settings className="h-4 w-4" /> Profile
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { handleSignOut(); setMobileOpen(false); }}
                    className="w-full font-heading gap-1"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                </div>
              ) : (
                <Link to="/auth" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full font-heading bg-primary text-primary-foreground">Join Now</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
