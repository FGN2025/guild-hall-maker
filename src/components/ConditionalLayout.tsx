import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import PublicLayout from "@/components/PublicLayout";

const ConditionalLayout = () => {
  const { user, loading, discordLinked, roleLoading, isAdmin, isModerator, isMarketing, isTenantStaff, emailConfirmed } = useAuth();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not logged in → public layout with navbar
  if (!user) {
    return <PublicLayout />;
  }

  // Logged in but email not confirmed → redirect
  if (!emailConfirmed) {
    return <Navigate to="/confirm-email" replace />;
  }

  // Logged in but no Discord → redirect (unless admin or exempt)
  if (!discordLinked && !isAdmin) {
    return <Navigate to="/link-discord" replace />;
  }

  // Logged in → full sidebar layout
  return <AppLayout />;
};

export default ConditionalLayout;
