import { lazy, Suspense } from "react";
import HeroSection from "@/components/HeroSection";
import Navbar from "@/components/Navbar";
import usePageTitle from "@/hooks/usePageTitle";

// Below-the-fold sections — lazy load so they don't block FCP/LCP.
const TickerEmbed = lazy(() => import("@/components/TickerEmbed"));
const FeaturedVideo = lazy(() => import("@/components/FeaturedVideo"));
const FeaturedEvents = lazy(() => import("@/components/FeaturedEvents"));

const Index = () => {
  usePageTitle("Home");
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <Suspense fallback={null}>
        <TickerEmbed />
        <FeaturedVideo />
        <FeaturedEvents />
      </Suspense>
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="font-display text-sm tracking-widest text-primary mb-4">FGN</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
            <a href="/terms" className="text-primary hover:underline">Terms &amp; Conditions</a>
            <span className="hidden sm:inline">·</span>
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
            <span className="hidden sm:inline">·</span>
            <a href="/acceptable-use" className="text-primary hover:underline">Acceptable Use Policy</a>
            <span className="hidden sm:inline">·</span>
            <a href="/disabled-users" className="text-primary hover:underline">Disabled Users Notice</a>
            <span className="hidden sm:inline">·</span>
            <a href="/for-providers" className="text-primary hover:underline">For Providers</a>
            <span className="hidden sm:inline">·</span>
            <a href="mailto:support@fgn.gg" className="text-primary hover:underline">Contact Us</a>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Fibre Gaming Network. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
