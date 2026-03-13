import { useEffect, useState } from "react";
import { Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import defaultLogo from "@/assets/fgn-hero-logo.png";
import ParticlesBackground from "@/components/ParticlesBackground";
import { supabase } from "@/integrations/supabase/client";



const HeroSection = () => {
  const [logoUrl, setLogoUrl] = useState<string>(defaultLogo);
  

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "hero_logo_url")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setLogoUrl(data.value);
      });
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      {/* Particles network */}
      <ParticlesBackground />

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-bg opacity-20 z-[2]" />

      <div className="relative z-10 container mx-auto px-6 md:px-10 lg:px-16 text-center">
        <div className="animate-slide-up">
          {/* Hero Logo */}
          <img
            src={logoUrl}
            alt="Fiber Gaming Network"
            className="max-h-20 md:max-h-28 mx-auto mb-6 object-contain"
          />

          <p className="font-display text-base md:text-xl lg:text-2xl tracking-[0.3em] text-primary mb-4 uppercase font-bold">
            Network Gaming Platform
          </p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6">
            <span className="text-foreground">FORGE YOUR</span>
            <br />
            <span className="gradient-text">LEGEND PATH</span>
          </h1>
          <p className="font-body text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-bold">
            Join Tournaments, climb Leaderboards, and compete with the best.
            The Ultimate Experience for Players on Fiber Broadband Networks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/tournaments">
              <Button size="lg" className="font-heading text-lg tracking-wide px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 neon-border">
                <Trophy className="mr-2 h-5 w-5" />
                Browse Tournaments
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" size="lg" className="font-heading text-lg tracking-wide px-8 py-6 border-border text-foreground hover:bg-secondary hover:border-primary/40">
                <Zap className="mr-2 h-5 w-5" />
                Player Dashboard
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;
