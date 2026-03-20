import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import CoachFloatingButton from "@/components/CoachFloatingButton";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import { CoachProvider } from "@/contexts/CoachContext";

const HEADERLESS_ROUTES = ["/tournaments"];

const AppLayout = () => {
  const location = useLocation();
  const hideHeader = HEADERLESS_ROUTES.includes(location.pathname);

  return (
    <CoachProvider>
      <SidebarProvider>
        <div className="h-screen flex w-full overflow-hidden">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {!hideHeader && (
              <header className="h-12 flex items-center border-b border-border px-4 shrink-0 bg-background">
                <SidebarTrigger />
              </header>
            )}
            <main className="flex-1 overflow-auto p-4 md:p-6">
              <Outlet />
            </main>
          </div>
        </div>
        <CoachFloatingButton />
        <ScrollToTopButton />
      </SidebarProvider>
    </CoachProvider>
  );
};

export default AppLayout;
