import { Trophy, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-65" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-bg opacity-20" />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="animate-slide-up">
          <p className="font-display text-base md:text-xl lg:text-2xl tracking-[0.3em] text-primary mb-4 uppercase">
            Competitive Gaming Platform
          </p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6">
            <span className="text-foreground">FORGE YOUR</span>
            <br />
            <span className="gradient-text">LEGEND</span>
          </h1>
          <p className="font-body text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Join tournaments, climb leaderboards, and compete with the best.
            The ultimate esports experience for players and organizers.
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

        {/* Stats bar */}
        <div className="animate-fade-in grid grid-cols-3 gap-6 max-w-xl mx-auto">
          {[
            { label: "Active Players", value: "12K+", icon: Users },
            { label: "Tournaments", value: "340+", icon: Trophy },
            { label: "Prize Pool", value: "$85K", icon: Zap },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel rounded-lg p-4">
              <stat.icon className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="font-body text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
