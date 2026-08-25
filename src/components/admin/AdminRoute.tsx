import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import AdminLayout from "./AdminLayout";
import { useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin, roleLoading, emailConfirmed } = useAuth();
  const { isTenantAdmin, isLoading: tenantLoading } = useTenantAdmin();
  // After the first successful settle, keep AdminLayout mounted if roleLoading
  // flickers (e.g. a background role refetch). Replacing children with the
  // full-screen spinner remounts Challenge Manager and loses in-progress edits.
  const hasSettledRef = useRef(false);

  const wouldRedirectToTenant = !!user && !isAdmin && isTenantAdmin;
  const authPending = loading || roleLoading || tenantLoading;

  if (!authPending) {
    hasSettledRef.current = true;
  }

  useEffect(() => {
    if (loading || roleLoading || tenantLoading) return;
    if (!user || isAdmin) return;
    if (wouldRedirectToTenant) {
      toast({
        title: "Opening your tenant admin dashboard",
        description: "The platform admin area is separate — taking you to your tenant area.",
      });
    } else {
      toast({ title: "Access denied", description: "You do not have admin privileges.", variant: "destructive" });
    }
  }, [loading, roleLoading, tenantLoading, user, isAdmin, wouldRedirectToTenant]);

  if (authPending && !hasSettledRef.current) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!emailConfirmed) return <Navigate to="/confirm-email" replace />;
  if (!isAdmin) {
    if (isTenantAdmin) return <Navigate to="/tenant" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <AdminLayout>{children}</AdminLayout>;
};

export default AdminRoute;
