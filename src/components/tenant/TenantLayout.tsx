import { ReactNode, useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import TenantSidebar from "./TenantSidebar";

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
  tenantRole: 'admin' | 'manager';
}

const TenantLayout = ({ children, tenantInfo, tenantRole }: TenantLayoutProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  // Apply tenant brand colors as CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    if (tenantInfo.primaryColor) {
      root.style.setProperty("--tenant-primary", tenantInfo.primaryColor);
    }
    if (tenantInfo.accentColor) {
      root.style.setProperty("--tenant-accent", tenantInfo.accentColor);
    }
    return () => {
      root.style.removeProperty("--tenant-primary");
      root.style.removeProperty("--tenant-accent");
    };
  }, [tenantInfo.primaryColor, tenantInfo.accentColor]);

  const brandAccent = tenantInfo.primaryColor || undefined;

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background flex">
        <TenantSidebar tenantName={tenantInfo.tenantName} tenantRole={tenantRole} logoUrl={tenantInfo.logoUrl} brandColor={brandAccent} />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-12 flex items-center border-b border-border px-4 bg-background shrink-0" style={brandAccent ? { borderBottomColor: brandAccent } : undefined}>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
           <SheetContent side="left" className="p-0 w-64">
            <div onClick={() => setOpen(false)}>
              <TenantSidebar tenantName={tenantInfo.tenantName} tenantRole={tenantRole} logoUrl={tenantInfo.logoUrl} brandColor={brandAccent} />
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
