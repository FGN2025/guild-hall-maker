import HeroSection from "@/components/HeroSection";
import TickerEmbed from "@/components/TickerEmbed";
import FeaturedVideo from "@/components/FeaturedVideo";
import FeaturedEvents from "@/components/FeaturedEvents";
import Navbar from "@/components/Navbar";
import usePageTitle from "@/hooks/usePageTitle";

const Index = () => {
  usePageTitle("Home");
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <TickerEmbed />
      <FeaturedVideo />
      <FeaturedEvents />
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6 md:px-10 lg:px-16 text-center">
          <p className="font-display text-sm tracking-widest text-primary mb-4">FGN</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
            <a href="/terms" className="text-primary hover:underline">Terms &amp; Conditions</a>
            <span className="hidden sm:inline">·</span>
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
            <span className="hidden sm:inline">·</span>
            <a href="/acceptable-use" className="text-primary hover:underline">Acceptable Use Policy</a>
            <span className="hidden sm:inline">·</span>
            <a href="/disabled-users" className="text-primary hover:underline">Disabled Users Notice</a>
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
