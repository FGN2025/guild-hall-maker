import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import ProviderLayout from "./ProviderLayout";

const ProviderRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { isTenantAdmin, isLoading, tenantInfo } = useTenantAdmin();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isTenantAdmin) return <Navigate to="/dashboard" replace />;

  return <ProviderLayout tenantInfo={tenantInfo!}>{children}</ProviderLayout>;
};

export default ProviderRoute;
