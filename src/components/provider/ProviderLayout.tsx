import { ReactNode } from "react";
import ProviderSidebar from "./ProviderSidebar";

interface ProviderLayoutProps {
  children: ReactNode;
  tenantInfo: {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
  };
}

const ProviderLayout = ({ children, tenantInfo }: ProviderLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex">
      <ProviderSidebar tenantName={tenantInfo.tenantName} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
};

export default ProviderLayout;
