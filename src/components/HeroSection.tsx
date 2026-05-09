import { lazy, Suspense, useEffect, useState } from "react";
import { Trophy, Zap, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import defaultLogo from "@/assets/fgn-hero-logo.png";
import apprenticeshipLogo from "@/assets/national-apprenticeship-week-2026.png";
import { supabase } from "@/integrations/supabase/client";
import { useDeferredMount } from "@/hooks/useDeferredMount";

// Particles engine is heavy (~30-40KB) — defer past first paint.
const ParticlesBackground = lazy(() => import("@/components/ParticlesBackground"));

const LOGO_CACHE_KEY = "fgn_hero_logo_url";

const HeroSection = () => {
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    if (typeof window === "undefined") return defaultLogo;
    return localStorage.getItem(LOGO_CACHE_KEY) || defaultLogo;
  });

  // Mount particles only after browser idle so they don't block FCP.
  const particlesReady = useDeferredMount(1200);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "hero_logo_url")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && data.value !== logoUrl) {
          setLogoUrl(data.value);
          try { localStorage.setItem(LOGO_CACHE_KEY, data.value); } catch {}
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      {/* Particles network — deferred */}
      {particlesReady && (
        <Suspense fallback={null}>
          <ParticlesBackground />
        </Suspense>
      )}

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-bg opacity-20 z-[2]" />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="animate-slide-up">
          {/* Hero Logo — fixed height to prevent CLS */}
          <img
            src={logoUrl}
            alt="Fiber Gaming Network"
            width={420}
            height={112}
            fetchPriority="high"
            className="max-h-20 md:max-h-28 w-auto mx-auto mb-6 object-contain"
          />

          <p className="font-display text-base md:text-xl lg:text-2xl tracking-[0.3em] text-primary mb-4 uppercase font-bold">
            Network Gaming Platform
          </p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6">
            <span className="text-foreground">PLAY · COMPETE</span>
            <br />
            <span className="gradient-text">LEARN · REPEAT</span>
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

          <p className="mt-6 font-bold text-foreground text-lg md:text-xl">
            Thank You for Competing in our Skills Challenges During:
          </p>
          <Link to="/challenges" className="inline-block mt-2 hover:opacity-80 transition-opacity">
            <img
              src={apprenticeshipLogo}
              alt="National Apprenticeship Week — April 26 – May 2, 2026"
              width={480}
              height={128}
              loading="lazy"
              className="max-h-24 md:max-h-32 w-auto mx-auto object-contain"
            />
          </Link>
          <Link to="/challenges" className="flex items-center justify-center gap-2 mt-2 animate-pulse text-primary font-semibold text-lg">
            <ArrowUp className="h-7 w-7" />
            Click Here!
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
