import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import TournamentCalendar from "./pages/TournamentCalendar";
import TournamentDetail from "./pages/TournamentDetail";
import TournamentManage from "./pages/TournamentManage";
import PlayerProfile from "./pages/PlayerProfile";
import SeasonStats from "./pages/SeasonStats";
import PlayerComparison from "./pages/PlayerComparison";
import Achievements from "./pages/Achievements";
import Challenges from "./pages/Challenges";
import PrizeShop from "./pages/PrizeShop";
import PlayerGuide from "./pages/PlayerGuide";
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
import AdminNotebooks from "./pages/admin/AdminNotebooks";
import AdminSeasons from "./pages/admin/AdminSeasons";
import AdminAchievements from "./pages/admin/AdminAchievements";
import AdminGuide from "./pages/admin/AdminGuide";
import ModeratorRoute from "./components/moderator/ModeratorRoute";
import ModeratorDashboard from "./pages/moderator/ModeratorDashboard";
import ModeratorTournaments from "./pages/moderator/ModeratorTournaments";
import ModeratorMatches from "./pages/moderator/ModeratorMatches";
import ModeratorPoints from "./pages/moderator/ModeratorPoints";
import ModeratorChallenges from "./pages/moderator/ModeratorChallenges";
import ModeratorLadders from "./pages/moderator/ModeratorLadders";
import ModeratorRedemptions from "./pages/moderator/ModeratorRedemptions";
import TenantRoute from "./components/tenant/TenantRoute";
import TenantDashboard from "./pages/tenant/TenantDashboard";
import TenantLeads from "./pages/tenant/TenantLeads";
import TenantZipCodes from "./pages/tenant/TenantZipCodes";
import TenantSubscribers from "./pages/tenant/TenantSubscribers";
import TenantTeam from "./pages/tenant/TenantTeam";
import TenantSettings from "./pages/tenant/TenantSettings";
import Terms from "./pages/Terms";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookieConsent from "./components/CookieConsent";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CookieConsent />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Authenticated routes with sidebar */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/tournaments/:id" element={<TournamentDetail />} />
              <Route path="/tournaments/:id/bracket" element={<TournamentBracket />} />
              <Route path="/calendar" element={<TournamentCalendar />} />
              <Route path="/tournaments/:id/manage" element={<TournamentManage />} />
              <Route path="/community" element={<Community />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/season-stats" element={<SeasonStats />} />
              <Route path="/compare" element={<PlayerComparison />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/games" element={<Games />} />
              <Route path="/games/:slug" element={<GameDetail />} />
              <Route path="/player/:id" element={<PlayerProfile />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/prize-shop" element={<PrizeShop />} />
              <Route path="/guide" element={<PlayerGuide />} />
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
            <Route path="/admin/notebooks" element={<AdminRoute><AdminNotebooks /></AdminRoute>} />
            <Route path="/admin/seasons" element={<AdminRoute><AdminSeasons /></AdminRoute>} />
            <Route path="/admin/achievements" element={<AdminRoute><AdminAchievements /></AdminRoute>} />
            <Route path="/admin/guide" element={<AdminRoute><AdminGuide /></AdminRoute>} />

            {/* Moderator routes */}
            <Route path="/moderator" element={<ModeratorRoute><ModeratorDashboard /></ModeratorRoute>} />
            <Route path="/moderator/tournaments" element={<ModeratorRoute><ModeratorTournaments /></ModeratorRoute>} />
            <Route path="/moderator/matches" element={<ModeratorRoute><ModeratorMatches /></ModeratorRoute>} />
            <Route path="/moderator/points" element={<ModeratorRoute><ModeratorPoints /></ModeratorRoute>} />
            <Route path="/moderator/challenges" element={<ModeratorRoute><ModeratorChallenges /></ModeratorRoute>} />
            <Route path="/moderator/ladders" element={<ModeratorRoute><ModeratorLadders /></ModeratorRoute>} />
            <Route path="/moderator/redemptions" element={<ModeratorRoute><ModeratorRedemptions /></ModeratorRoute>} />

            {/* Tenant routes */}
            <Route path="/tenant" element={<TenantRoute><TenantDashboard /></TenantRoute>} />
            <Route path="/tenant/leads" element={<TenantRoute><TenantLeads /></TenantRoute>} />
            <Route path="/tenant/zip-codes" element={<TenantRoute><TenantZipCodes /></TenantRoute>} />
            <Route path="/tenant/subscribers" element={<TenantRoute><TenantSubscribers /></TenantRoute>} />
            <Route path="/tenant/team" element={<TenantRoute><TenantTeam /></TenantRoute>} />
            <Route path="/tenant/settings" element={<TenantRoute><TenantSettings /></TenantRoute>} />

            <Route path="/coach" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
