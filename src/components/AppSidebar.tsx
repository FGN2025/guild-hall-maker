import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useCoach } from "@/contexts/CoachContext";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Trophy,
  LayoutDashboard,
  Users,
  Shield,
  BarChart3,
  Swords,
  SwordIcon,
  Award,
  Target,
  Gift,
  Gamepad2,
  CalendarDays,
  Joystick,
  Settings,
  LogOut,
  ShieldCheck,
  Building2,
  BrainCircuit,
  BookOpen,
  Megaphone,
  KeyRound,
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
  { to: "/challenges", label: "Challenges", icon: Target },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/community", label: "Community", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: Shield },
  { to: "/season-stats", label: "Stats", icon: BarChart3 },
  { to: "/compare", label: "Compare", icon: Swords },
  { to: "/achievements", label: "Badges", icon: Award },
  { to: "/prize-shop", label: "Prize Shop", icon: Gift },
  { to: "/ladders", label: "Ladders", icon: SwordIcon },
  { to: "/guide", label: "Player Guide", icon: BookOpen },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { isAdmin, isModerator, isMarketing, signOut } = useAuth();
  const { setIsOpen: openCoach } = useCoach();
  const { isTenantAdmin } = useTenantAdmin();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <NavLink to="/" className="flex items-center gap-2 group">
          <Joystick className="h-6 w-6 text-primary shrink-0" />
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
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="AI Coach" onClick={() => openCoach(true)}>
                  <BrainCircuit className="h-4 w-4 shrink-0" />
                  <span>AI Coach</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                   <SidebarMenuButton asChild tooltip="Admin Dashboard">
                     <NavLink
                       to="/admin"
                       className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                       activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                     >
                       <ShieldCheck className="h-4 w-4 shrink-0" />
                       <span>Admin Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(isModerator || isAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel>Moderator</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                   <SidebarMenuButton asChild tooltip="Moderator Dashboard">
                     <NavLink
                       to="/moderator"
                       className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                       activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                     >
                       <SwordIcon className="h-4 w-4 shrink-0" />
                       <span>Moderator Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(isAdmin || isMarketing) && (
          <SidebarGroup>
            <SidebarGroupLabel>Marketing</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Marketing Dashboard">
                    <NavLink
                      to="/admin/marketing"
                      className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <Megaphone className="h-4 w-4 shrink-0" />
                      <span>Marketing Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(isTenantAdmin || isAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel>Tenant</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                   <SidebarMenuButton asChild tooltip="Tenant Dashboard">
                     <NavLink
                       to="/tenant"
                       className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                       activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                     >
                       <Building2 className="h-4 w-4 shrink-0" />
                       <span>Tenant Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton asChild tooltip="Codes">
                     <NavLink
                       to="/tenant/codes"
                       className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                       activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                     >
                       <KeyRound className="h-4 w-4 shrink-0" />
                       <span>Codes</span>
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
            <ThemeToggle />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <NotificationBell />
          </SidebarMenuItem>
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
