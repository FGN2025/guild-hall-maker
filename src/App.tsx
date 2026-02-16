import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Tournaments from "./pages/Tournaments";
import Dashboard from "./pages/Dashboard";
import Community from "./pages/Community";
import Leaderboard from "./pages/Leaderboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProfileSettings from "./pages/ProfileSettings";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import TournamentBracket from "./pages/TournamentBracket";
import TournamentManage from "./pages/TournamentManage";
import PlayerProfile from "./pages/PlayerProfile";
import SeasonStats from "./pages/SeasonStats";
import PlayerComparison from "./pages/PlayerComparison";
import Achievements from "./pages/Achievements";
import Games from "./pages/Games";
import GameDetail from "./pages/GameDetail";
import AdminRoute from "./components/admin/AdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTournaments from "./pages/admin/AdminTournaments";
import AdminBypassCodes from "./pages/admin/AdminBypassCodes";
import AdminTenants from "./pages/admin/AdminTenants";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminGames from "./pages/admin/AdminGames";
import TenantRoute from "./components/tenant/TenantRoute";
import TenantDashboard from "./pages/tenant/TenantDashboard";
import TenantLeads from "./pages/tenant/TenantLeads";
import TenantZipCodes from "./pages/tenant/TenantZipCodes";
import TenantSubscribers from "./pages/tenant/TenantSubscribers";
import Terms from "./pages/Terms";
import PrivacyPolicy from "./pages/PrivacyPolicy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />

            {/* Authenticated routes with sidebar */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/tournaments/:id/bracket" element={<TournamentBracket />} />
              <Route path="/tournaments/:id/manage" element={<TournamentManage />} />
              <Route path="/community" element={<Community />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/season-stats" element={<SeasonStats />} />
              <Route path="/compare" element={<PlayerComparison />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/games" element={<Games />} />
              <Route path="/games/:slug" element={<GameDetail />} />
              <Route path="/player/:id" element={<PlayerProfile />} />
              <Route path="/profile" element={<ProfileSettings />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/media" element={<AdminRoute><AdminMedia /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/admin/tournaments" element={<AdminRoute><AdminTournaments /></AdminRoute>} />
            <Route path="/admin/bypass-codes" element={<AdminRoute><AdminBypassCodes /></AdminRoute>} />
            <Route path="/admin/tenants" element={<AdminRoute><AdminTenants /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            <Route path="/admin/games" element={<AdminRoute><AdminGames /></AdminRoute>} />

            {/* Tenant routes */}
            <Route path="/tenant" element={<TenantRoute><TenantDashboard /></TenantRoute>} />
            <Route path="/tenant/leads" element={<TenantRoute><TenantLeads /></TenantRoute>} />
            <Route path="/tenant/zip-codes" element={<TenantRoute><TenantZipCodes /></TenantRoute>} />
            <Route path="/tenant/subscribers" element={<TenantRoute><TenantSubscribers /></TenantRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
