import { Link, useLocation } from "react-router-dom";
import { Trophy, LayoutDashboard, Users, Shield, Gamepad2, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/community", label: "Community", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: Shield },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" className="font-heading tracking-wide text-muted-foreground hover:text-foreground">
            Sign In
          </Button>
          <Button size="sm" className="font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90">
            Join Now
          </Button>
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
            <div className="flex gap-2 pt-2 border-t border-border/50 mt-2">
              <Button variant="ghost" size="sm" className="flex-1 font-heading">Sign In</Button>
              <Button size="sm" className="flex-1 font-heading bg-primary text-primary-foreground">Join Now</Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
