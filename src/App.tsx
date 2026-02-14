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
import TournamentBracket from "./pages/TournamentBracket";
import TournamentManage from "./pages/TournamentManage";
import PlayerProfile from "./pages/PlayerProfile";
import SeasonStats from "./pages/SeasonStats";

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
            <Route path="/tournaments" element={<ProtectedRoute><Tournaments /></ProtectedRoute>} />
            <Route path="/tournaments/:id/bracket" element={<ProtectedRoute><TournamentBracket /></ProtectedRoute>} />
            <Route path="/tournaments/:id/manage" element={<ProtectedRoute><TournamentManage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/season-stats" element={<ProtectedRoute><SeasonStats /></ProtectedRoute>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/player/:id" element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
