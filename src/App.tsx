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
import AdminRoute from "./components/admin/AdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTournaments from "./pages/admin/AdminTournaments";
import AdminBypassCodes from "./pages/admin/AdminBypassCodes";
import AdminTenants from "./pages/admin/AdminTenants";
import ProviderRoute from "./components/provider/ProviderRoute";
import ProviderDashboard from "./pages/provider/ProviderDashboard";
import ProviderLeads from "./pages/provider/ProviderLeads";
import ProviderZipCodes from "./pages/provider/ProviderZipCodes";

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

            {/* Provider routes */}
            <Route path="/provider" element={<ProviderRoute><ProviderDashboard /></ProviderRoute>} />
            <Route path="/provider/leads" element={<ProviderRoute><ProviderLeads /></ProviderRoute>} />
            <Route path="/provider/zip-codes" element={<ProviderRoute><ProviderZipCodes /></ProviderRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
