import { ReactNode } from "react";
import TenantSidebar from "./TenantSidebar";

interface TenantLayoutProps {
  children: ReactNode;
  tenantInfo: {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
  };
}

const TenantLayout = ({ children, tenantInfo }: TenantLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex">
      <TenantSidebar tenantName={tenantInfo.tenantName} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
};

export default TenantLayout;
