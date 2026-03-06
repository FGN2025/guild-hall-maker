import { ReactNode, useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import TenantSidebar from "./TenantSidebar";

interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
}

interface TenantLayoutProps {
  children: ReactNode;
  tenantInfo: {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
  };
  tenantRole: 'admin' | 'manager' | 'marketing';
  isPlatformAdmin?: boolean;
  allTenants?: TenantListItem[];
  selectedTenantId?: string | null;
  onTenantChange?: (id: string | null) => void;
}

const TenantLayout = ({ children, tenantInfo, tenantRole, isPlatformAdmin, allTenants, selectedTenantId, onTenantChange }: TenantLayoutProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  // Apply tenant brand colors as CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    if (tenantInfo.primaryColor) {
      root.style.setProperty("--tenant-primary", tenantInfo.primaryColor);
      root.classList.add("tenant-branded");
    }
    if (tenantInfo.accentColor) {
      root.style.setProperty("--tenant-accent", tenantInfo.accentColor);
    }
    return () => {
      root.style.removeProperty("--tenant-primary");
      root.style.removeProperty("--tenant-accent");
      root.classList.remove("tenant-branded");
    };
  }, [tenantInfo.primaryColor, tenantInfo.accentColor]);

  const brandAccent = tenantInfo.primaryColor || undefined;

  const sidebarProps = {
    tenantName: tenantInfo.tenantName,
    tenantRole,
    logoUrl: tenantInfo.logoUrl,
    brandColor: brandAccent,
    isPlatformAdmin,
    allTenants,
    selectedTenantId,
    onTenantChange,
  };

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background flex tenant-portal">
        <TenantSidebar {...sidebarProps} />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col tenant-portal">
      <header className="h-12 flex items-center border-b border-border px-4 bg-background shrink-0" style={brandAccent ? { borderBottomColor: brandAccent } : undefined}>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
           <SheetContent side="left" className="p-0 w-64">
            <div onClick={() => setOpen(false)}>
              <TenantSidebar {...sidebarProps} />
            </div>
          </SheetContent>
        </Sheet>
        {tenantInfo.logoUrl ? (
          <img src={tenantInfo.logoUrl} alt={tenantInfo.tenantName} className="ml-3 h-6 w-6 rounded object-contain" />
        ) : null}
        <span className={`${tenantInfo.logoUrl ? 'ml-2' : 'ml-3'} font-display text-sm font-bold truncate`} style={brandAccent ? { color: brandAccent } : undefined}>{tenantInfo.tenantName}</span>
      </header>
      <main className="flex-1 p-4 overflow-auto">{children}</main>
    </div>
  );
};

export default TenantLayout;
