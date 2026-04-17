import { Outlet, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import { CoachProvider } from "@/contexts/CoachContext";
import { TenantBrandingProvider } from "@/contexts/TenantBrandingContext";
import TenantBannerSlot from "@/components/branding/TenantBannerSlot";

const CoachFloatingButton = lazy(() => import("@/components/CoachFloatingButton"));

const HEADERLESS_ROUTES = ["/tournaments", "/dashboard"];

const AppLayout = () => {
  const location = useLocation();
  const hideHeader = HEADERLESS_ROUTES.includes(location.pathname);

  return (
    <TenantBrandingProvider>
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
              <main className={`flex-1 overflow-auto ${hideHeader ? 'px-4 md:px-6 pb-4 md:pb-6' : 'p-4 md:p-6'}`}>
                <TenantBannerSlot />
                <Outlet />
              </main>
            </div>
          </div>
          <Suspense fallback={null}>
            <CoachFloatingButton />
          </Suspense>
          <ScrollToTopButton />
        </SidebarProvider>
      </CoachProvider>
    </TenantBrandingProvider>
  );
};

export default AppLayout;
