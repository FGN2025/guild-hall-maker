import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const DISCORD_EXEMPT_PATHS = ["/link-discord", "/profile"];

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, loading, discordLinked, roleLoading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Discord gate — exempt certain paths
  if (!discordLinked && !isAdmin && !DISCORD_EXEMPT_PATHS.includes(location.pathname)) {
    return <Navigate to="/link-discord" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
