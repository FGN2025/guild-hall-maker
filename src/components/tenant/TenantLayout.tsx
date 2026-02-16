import { ReactNode } from "react";
import TenantSidebar from "./TenantSidebar";

interface TenantLayoutProps {
  children: ReactNode;
  tenantInfo: {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
  };
  tenantRole: 'admin' | 'manager';
}

const TenantLayout = ({ children, tenantInfo, tenantRole }: TenantLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex">
      <TenantSidebar tenantName={tenantInfo.tenantName} tenantRole={tenantRole} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
};

export default TenantLayout;
