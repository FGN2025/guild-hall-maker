import { ReactNode, useState } from "react";
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
  };
  tenantRole: 'admin' | 'manager';
}

const TenantLayout = ({ children, tenantInfo, tenantRole }: TenantLayoutProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background flex">
        <TenantSidebar tenantName={tenantInfo.tenantName} tenantRole={tenantRole} />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-12 flex items-center border-b border-border px-4 bg-background shrink-0">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <div onClick={() => setOpen(false)}>
              <TenantSidebar tenantName={tenantInfo.tenantName} tenantRole={tenantRole} />
            </div>
          </SheetContent>
        </Sheet>
        <span className="ml-3 font-display text-sm font-bold text-primary truncate">{tenantInfo.tenantName}</span>
      </header>
      <main className="flex-1 p-4 overflow-auto">{children}</main>
    </div>
  );
};

export default TenantLayout;
