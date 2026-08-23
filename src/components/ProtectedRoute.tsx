import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authUrlFor } from "@/lib/returnPath";

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, loading, roleLoading, emailConfirmed } = useAuth();
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
    // Carry the intended destination through sign-in (digest email deep links).
    return <Navigate to={authUrlFor(location)} replace />;
  }


  if (!emailConfirmed) {
    return <Navigate to="/confirm-email" replace />;
  }

  // Discord linking is optional — no gate. Users opt in from profile.
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
