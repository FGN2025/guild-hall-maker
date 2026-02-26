import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ModeratorSidebar from "./ModeratorSidebar";

const ModeratorLayout = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background flex">
        <ModeratorSidebar />
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
              <ModeratorSidebar />
            </div>
          </SheetContent>
        </Sheet>
        <span className="ml-3 font-display text-sm font-bold text-primary">Moderator Panel</span>
      </header>
      <main className="flex-1 p-4 overflow-auto">{children}</main>
    </div>
  );
};

export default ModeratorLayout;
