import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import {
  Trophy,
  LayoutDashboard,
  Users,
  Shield,
  BarChart3,
  Swords,
  Award,
  Gamepad2,
  Settings,
  LogOut,
  ShieldCheck,
  Building2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const mainNav = [
  { to: "/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/community", label: "Community", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: Shield },
  { to: "/season-stats", label: "Stats", icon: BarChart3 },
  { to: "/compare", label: "Compare", icon: Swords },
  { to: "/achievements", label: "Badges", icon: Award },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { isAdmin, signOut } = useAuth();
  const { isTenantAdmin } = useTenantAdmin();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <NavLink to="/" className="flex items-center gap-2 group">
          <Gamepad2 className="h-6 w-6 text-primary shrink-0" />
          <span className="font-display text-lg font-bold tracking-wider text-sidebar-foreground group-hover:text-primary transition-colors group-data-[collapsible=icon]:hidden">
            FGN
          </span>
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <NavLink
                      to={item.to}
                      end
                      className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Admin Panel">
                    <NavLink
                      to="/admin"
                      className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      <span>Admin Panel</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isTenantAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Tenant</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Tenant Panel">
                    <NavLink
                      to="/tenant"
                      className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span>Tenant Panel</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Profile">
              <NavLink
                to="/profile"
                className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>Profile</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign Out" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
