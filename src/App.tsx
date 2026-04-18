import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import CookieConsent from "./components/CookieConsent";

// Eagerly loaded — critical entry points
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import ConditionalLayout from "./components/ConditionalLayout";
import AdminRoute from "./components/admin/AdminRoute";
import MarketingRoute from "./components/admin/MarketingRoute";
import ModeratorRoute from "./components/moderator/ModeratorRoute";
import TenantRoute from "./components/tenant/TenantRoute";

// Lazy-loaded pages
const Tournaments = lazy(() => import("./pages/Tournaments"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Community = lazy(() => import("./pages/Community"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const LinkDiscord = lazy(() => import("./pages/LinkDiscord"));
const TournamentBracket = lazy(() => import("./pages/TournamentBracket"));
const TournamentCalendar = lazy(() => import("./pages/TournamentCalendar"));
const TournamentDetail = lazy(() => import("./pages/TournamentDetail"));
const TournamentManage = lazy(() => import("./pages/TournamentManage"));
const PlayerProfile = lazy(() => import("./pages/PlayerProfile"));
const SeasonStats = lazy(() => import("./pages/SeasonStats"));
const PlayerComparison = lazy(() => import("./pages/PlayerComparison"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Challenges = lazy(() => import("./pages/Challenges"));
const ChallengeDetail = lazy(() => import("./pages/ChallengeDetail"));
const Quests = lazy(() => import("./pages/Quests"));
const QuestDetail = lazy(() => import("./pages/QuestDetail"));
const PrizeShop = lazy(() => import("./pages/PrizeShop"));
const PlayerGuide = lazy(() => import("./pages/PlayerGuide"));
const Games = lazy(() => import("./pages/Games"));
const GameDetail = lazy(() => import("./pages/GameDetail"));
const Ladders = lazy(() => import("./pages/Ladders"));
const Terms = lazy(() => import("./pages/Terms"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const AcceptableUsePolicy = lazy(() => import("./pages/AcceptableUsePolicy"));
const DisabledUsersNotice = lazy(() => import("./pages/DisabledUsersNotice"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ConfirmEmail = lazy(() => import("./pages/ConfirmEmail"));
const TenantEventPage = lazy(() => import("./pages/TenantEventPage"));
const TenantEventDetail = lazy(() => import("./pages/TenantEventDetail"));
const EmbedCalendar = lazy(() => import("./pages/EmbedCalendar"));
const WebPageView = lazy(() => import("./pages/WebPageView"));
const MediaLibrary = lazy(() => import("./pages/MediaLibrary"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminMedia = lazy(() => import("./pages/admin/AdminMedia"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminTournaments = lazy(() => import("./pages/admin/AdminTournaments"));
const AdminChallenges = lazy(() => import("./pages/admin/AdminChallenges"));
const AdminBypassCodes = lazy(() => import("./pages/admin/AdminBypassCodes"));
const AdminTenants = lazy(() => import("./pages/admin/AdminTenants"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminGames = lazy(() => import("./pages/admin/AdminGames"));
const AdminNotebooks = lazy(() => import("./pages/admin/AdminNotebooks"));
const AdminSeasons = lazy(() => import("./pages/admin/AdminSeasons"));
const AdminAchievements = lazy(() => import("./pages/admin/AdminAchievements"));
const AdminGuide = lazy(() => import("./pages/admin/AdminGuide"));
const AdminMarketing = lazy(() => import("./pages/admin/AdminMarketing"));
const AdminAccessRequests = lazy(() => import("./pages/admin/AdminAccessRequests"));
const AdminLegacyUsers = lazy(() => import("./pages/admin/AdminLegacyUsers"));
const AdminEcosystem = lazy(() => import("./pages/admin/AdminEcosystem"));
const AdminWebPages = lazy(() => import("./pages/admin/AdminWebPages"));
const AdminDiscordBypass = lazy(() => import("./pages/admin/AdminDiscordBypass"));
const AdminGameServers = lazy(() => import("./pages/admin/AdminGameServers"));
const GameServers = lazy(() => import("./pages/GameServers"));
const AdminCloudGaming = lazy(() => import("./pages/admin/AdminCloudGaming"));
const AdminInquiries = lazy(() => import("./pages/admin/AdminInquiries"));
const AdminPointsRubric = lazy(() => import("./pages/admin/AdminPointsRubric"));
const WhitePaper = lazy(() => import("./pages/WhitePaper"));
const ForProviders = lazy(() => import("./pages/ForProviders"));
const TournamentGuide = lazy(() => import("./pages/guides/TournamentGuide"));
const ChallengeGuide = lazy(() => import("./pages/guides/ChallengeGuide"));
const QuestGuide = lazy(() => import("./pages/guides/QuestGuide"));

// Moderator pages
const ModeratorDashboard = lazy(() => import("./pages/moderator/ModeratorDashboard"));
const ModeratorTournaments = lazy(() => import("./pages/moderator/ModeratorTournaments"));
const ModeratorMatches = lazy(() => import("./pages/moderator/ModeratorMatches"));
const ModeratorPoints = lazy(() => import("./pages/moderator/ModeratorPoints"));
const ModeratorChallenges = lazy(() => import("./pages/moderator/ModeratorChallenges"));
const ModeratorLadders = lazy(() => import("./pages/moderator/ModeratorLadders"));
const ModeratorRedemptions = lazy(() => import("./pages/moderator/ModeratorRedemptions"));
const ModeratorAchievements = lazy(() => import("./pages/moderator/ModeratorAchievements"));
const ModeratorGuide = lazy(() => import("./pages/moderator/ModeratorGuide"));
const ModeratorCDLGenerate = lazy(() => import("./pages/moderator/ModeratorCDLGenerate"));

// Tenant pages
const TenantDashboard = lazy(() => import("./pages/tenant/TenantDashboard"));
const TenantLeads = lazy(() => import("./pages/tenant/TenantLeads"));
const TenantZipCodes = lazy(() => import("./pages/tenant/TenantZipCodes"));
const TenantSubscribers = lazy(() => import("./pages/tenant/TenantSubscribers"));
const TenantTeam = lazy(() => import("./pages/tenant/TenantTeam"));
const TenantSettings = lazy(() => import("./pages/tenant/TenantSettings"));
const TenantMarketing = lazy(() => import("./pages/tenant/TenantMarketing"));
const TenantMarketingDetail = lazy(() => import("./pages/tenant/TenantMarketingDetail"));
const TenantPlayers = lazy(() => import("./pages/tenant/TenantPlayers"));
const TenantEvents = lazy(() => import("./pages/tenant/TenantEvents"));
const TenantGuide = lazy(() => import("./pages/tenant/TenantGuide"));
const TenantCodes = lazy(() => import("./pages/tenant/TenantCodes"));
const TenantMarketingAssets = lazy(() => import("./pages/tenant/TenantMarketingAssets"));
const TenantWebPages = lazy(() => import("./pages/tenant/TenantWebPages"));
const TenantBranding = lazy(() => import("./pages/tenant/TenantBranding"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CookieConsent />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/acceptable-use" element={<AcceptableUsePolicy />} />
              <Route path="/disabled-users" element={<DisabledUsersNotice />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/confirm-email" element={<ConfirmEmail />} />
              <Route path="/events/:tenantSlug" element={<TenantEventPage />} />
              <Route path="/events/:tenantSlug/:eventId" element={<TenantEventDetail />} />
              <Route path="/embed/calendar/:configId" element={<EmbedCalendar />} />
              <Route path="/for-providers" element={<ForProviders />} />
              <Route path="/4-providers" element={<ForProviders />} />
              <Route path="/pages/:tenantSlug/:pageSlug" element={<WebPageView />} />

              {/* Authenticated but Discord-exempt */}
              <Route element={<ProtectedRoute />}>
                <Route path="/link-discord" element={<LinkDiscord />} />
              </Route>

              {/* Public-or-authenticated routes (tournaments & challenges) */}
              <Route element={<ConditionalLayout />}>
                <Route path="/tournaments" element={<Tournaments />} />
                <Route path="/tournaments/:id" element={<TournamentDetail />} />
                <Route path="/tournaments/:id/bracket" element={<TournamentBracket />} />
                <Route path="/challenges" element={<Challenges />} />
                <Route path="/challenges/:id" element={<ChallengeDetail />} />
                <Route path="/quests" element={<Quests />} />
                <Route path="/quests/:id" element={<QuestDetail />} />
                <Route path="/servers" element={<GameServers />} />
                <Route path="/game-servers" element={<GameServers />} />
                <Route path="/white-paper" element={<WhitePaper />} />
              </Route>

              {/* Authenticated routes with sidebar */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
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
                <Route path="/prize-shop" element={<PrizeShop />} />
                <Route path="/guide" element={<PlayerGuide />} />
                <Route path="/ladders" element={<Ladders />} />
                <Route path="/profile" element={<ProfileSettings />} />
                <Route path="/guide/tournaments" element={<TournamentGuide />} />
                <Route path="/guide/challenges" element={<ChallengeGuide />} />
                <Route path="/guide/quests" element={<QuestGuide />} />
              </Route>

              {/* Admin routes */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/media" element={<MarketingRoute><AdminMedia /></MarketingRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/admin/tournaments" element={<AdminRoute><AdminTournaments /></AdminRoute>} />
              <Route path="/admin/challenges" element={<AdminRoute><AdminChallenges /></AdminRoute>} />
              <Route path="/admin/bypass-codes" element={<AdminRoute><AdminBypassCodes /></AdminRoute>} />
              <Route path="/admin/tenants" element={<AdminRoute><AdminTenants /></AdminRoute>} />
              <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
              <Route path="/admin/games" element={<AdminRoute><AdminGames /></AdminRoute>} />
              <Route path="/admin/notebooks" element={<AdminRoute><AdminNotebooks /></AdminRoute>} />
              <Route path="/admin/seasons" element={<AdminRoute><AdminSeasons /></AdminRoute>} />
              <Route path="/admin/achievements" element={<AdminRoute><AdminAchievements /></AdminRoute>} />
              <Route path="/admin/guide" element={<MarketingRoute><AdminGuide /></MarketingRoute>} />
              <Route path="/admin/marketing" element={<MarketingRoute><AdminMarketing /></MarketingRoute>} />
              <Route path="/admin/access-requests" element={<AdminRoute><AdminAccessRequests /></AdminRoute>} />
              <Route path="/admin/discord-bypass" element={<AdminRoute><AdminDiscordBypass /></AdminRoute>} />
              <Route path="/admin/legacy-users" element={<AdminRoute><AdminLegacyUsers /></AdminRoute>} />
              <Route path="/admin/ecosystem" element={<AdminRoute><AdminEcosystem /></AdminRoute>} />
              <Route path="/admin/game-servers" element={<AdminRoute><AdminGameServers /></AdminRoute>} />
              <Route path="/admin/cloud-gaming" element={<AdminRoute><AdminCloudGaming /></AdminRoute>} />
              <Route path="/admin/inquiries" element={<AdminRoute><AdminInquiries /></AdminRoute>} />
              <Route path="/admin/points-rubric" element={<AdminRoute><AdminPointsRubric /></AdminRoute>} />

              {/* Moderator routes */}
              <Route path="/moderator" element={<ModeratorRoute><ModeratorDashboard /></ModeratorRoute>} />
              <Route path="/moderator/tournaments" element={<ModeratorRoute><ModeratorTournaments /></ModeratorRoute>} />
              <Route path="/moderator/matches" element={<ModeratorRoute><ModeratorMatches /></ModeratorRoute>} />
              <Route path="/moderator/points" element={<ModeratorRoute><ModeratorPoints /></ModeratorRoute>} />
              <Route path="/moderator/challenges" element={<ModeratorRoute><ModeratorChallenges /></ModeratorRoute>} />
              <Route path="/moderator/ladders" element={<ModeratorRoute><ModeratorLadders /></ModeratorRoute>} />
              <Route path="/moderator/achievements" element={<ModeratorRoute><ModeratorAchievements /></ModeratorRoute>} />
              <Route path="/moderator/redemptions" element={<ModeratorRoute><ModeratorRedemptions /></ModeratorRoute>} />
              <Route path="/moderator/guide" element={<ModeratorRoute><ModeratorGuide /></ModeratorRoute>} />
              <Route path="/moderator/challenges/generate" element={<ModeratorRoute><ModeratorCDLGenerate /></ModeratorRoute>} />
              <Route path="/admin/challenges/generate" element={<AdminRoute><ModeratorCDLGenerate /></AdminRoute>} />

              {/* Tenant routes */}
              <Route path="/tenant" element={<TenantRoute><TenantDashboard /></TenantRoute>} />
              <Route path="/tenant/players" element={<TenantRoute><TenantPlayers /></TenantRoute>} />
              <Route path="/tenant/leads" element={<TenantRoute><TenantLeads /></TenantRoute>} />
              <Route path="/tenant/zip-codes" element={<TenantRoute><TenantZipCodes /></TenantRoute>} />
              <Route path="/tenant/subscribers" element={<TenantRoute><TenantSubscribers /></TenantRoute>} />
              <Route path="/tenant/team" element={<TenantRoute><TenantTeam /></TenantRoute>} />
              <Route path="/tenant/settings" element={<TenantRoute><TenantSettings /></TenantRoute>} />
              <Route path="/tenant/marketing" element={<TenantRoute><TenantMarketing /></TenantRoute>} />
              <Route path="/tenant/marketing/:id" element={<TenantRoute><TenantMarketingDetail /></TenantRoute>} />
              <Route path="/tenant/events" element={<TenantRoute><TenantEvents /></TenantRoute>} />
              <Route path="/tenant/codes" element={<TenantRoute><TenantCodes /></TenantRoute>} />
              <Route path="/tenant/guide" element={<TenantRoute><TenantGuide /></TenantRoute>} />
              <Route path="/tenant/branding" element={<TenantRoute><TenantBranding /></TenantRoute>} />

              <Route path="/coach" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
