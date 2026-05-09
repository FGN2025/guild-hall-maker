import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const DISCORD_EXEMPT_PATHS = ["/link-discord", "/profile"];

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, loading, discordLinked, roleLoading, isAdmin, isModerator, isMarketing, isTenantStaff, emailConfirmed } = useAuth();
  const location = useLocation();

  // Skip the full-screen spinner if a session is already cached on disk —
  // Supabase will rehydrate it synchronously, so we can render optimistically.
  const hasCachedSession =
    typeof window !== "undefined" &&
    Object.keys(window.localStorage).some((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));

  if ((loading || roleLoading) && !hasCachedSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // While auth is still resolving but we have a cached session, render nothing
  // (transparent) rather than flashing a spinner.
  if (loading) return null;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!emailConfirmed) {
    return <Navigate to="/confirm-email" replace />;
  }

  // Discord gate — exempt certain paths and all admin/tenant routes
  const isExempt = DISCORD_EXEMPT_PATHS.includes(location.pathname) ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/tenant");
  const isStaff = isAdmin || isModerator || isMarketing || isTenantStaff;
  if (!discordLinked && !isStaff && !isExempt) {
    return <Navigate to="/link-discord" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
