import HeroSection from "@/components/HeroSection";
import FeaturedVideo from "@/components/FeaturedVideo";
import FeaturedTournaments from "@/components/FeaturedTournaments";
import Navbar from "@/components/Navbar";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturedVideo />
      <FeaturedTournaments />
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="font-display text-sm tracking-widest text-primary mb-2">FGN</p>
          <p className="text-sm text-muted-foreground">© 2026 Fibre Gaming Network. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
