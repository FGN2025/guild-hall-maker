import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import TenantLayout from "./TenantLayout";

export type TenantRoleName = "admin" | "manager" | "marketing";

const TenantRoute = ({
  children,
  requiredRoles,
}: {
  children: React.ReactNode;
  requiredRoles?: TenantRoleName[];
}) => {
  const { user, loading, isAdmin, emailConfirmed } = useAuth();
  const { isTenantAdmin, isLoading, tenantInfo, isPlatformAdminMode, allTenants, selectedTenantId, setSelectedTenantId } = useTenantAdmin();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!emailConfirmed) return <Navigate to="/confirm-email" replace />;
  if (!isTenantAdmin && !isAdmin) return <Navigate to="/dashboard" replace />;

  // Platform admin with no tenants available
  if (isAdmin && !tenantInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No active tenants found.</p>
      </div>
    );
  }

  // Role gate: platform admins in tenant-switching mode always pass
  if (requiredRoles && !isAdmin && tenantInfo && !requiredRoles.includes(tenantInfo.tenantRole)) {
    // Marketing users have no access to the tenant dashboard, send them to Marketing
    const fallback = tenantInfo.tenantRole === "marketing" ? "/tenant/marketing" : "/tenant";
    return <Navigate to={fallback} replace />;
  }



  return (
    <TenantLayout
      tenantInfo={{
        ...tenantInfo!,
        logoUrl: tenantInfo!.logoUrl,
        primaryColor: tenantInfo!.primaryColor,
        accentColor: tenantInfo!.accentColor,
      }}
      tenantRole={tenantInfo!.tenantRole}
      isPlatformAdmin={isPlatformAdminMode}
      allTenants={allTenants}
      selectedTenantId={selectedTenantId}
      onTenantChange={setSelectedTenantId}
    >
      {children}
    </TenantLayout>
  );
};

export default TenantRoute;
