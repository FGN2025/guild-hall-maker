import { Link, useLocation } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  usePageTitle("Page Not Found");
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const { isTenantAdmin } = useTenantAdmin();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center max-w-md px-6">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Oops! Page not found</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {user && isAdmin && (
            <Button asChild>
              <Link to="/admin">Go to Admin Dashboard</Link>
            </Button>
          )}
          {user && !isAdmin && isTenantAdmin && (
            <Button asChild>
              <Link to="/tenant">Go to Tenant Admin</Link>
            </Button>
          )}
          {user && !isAdmin && !isTenantAdmin && (
            <Button asChild>
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
