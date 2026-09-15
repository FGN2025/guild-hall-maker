import { Badge } from "@/components/ui/badge";
import { Gamepad2 } from "lucide-react";
import { getGameIdentity } from "@/lib/gameIdentity";

interface GameChallengeHeroProps {
  name: string;
  category: string;
  slug: string;
  description?: string | null;
  platformTags?: string[];
}

const GameChallengeHero = ({ name, category, slug, description, platformTags = [] }: GameChallengeHeroProps) => {
  const identity = getGameIdentity(slug, category);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10">
      <img
        src={identity.banner}
        alt={`${name} challenge hub`}
        width={1536}
        height={512}
        className="h-56 w-full object-cover md:h-64"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-center gap-3 p-6 md:p-8">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-black/50"
          style={{ boxShadow: "0 0 24px -6px hsl(var(--game-accent))" }}
        >
          <Gamepad2 className="h-6 w-6" style={{ color: "hsl(var(--game-accent))" }} />
        </div>
        <h1 className="max-w-xl font-display text-3xl font-bold text-foreground md:text-4xl">{name}</h1>
        <p className="max-w-xl font-body text-sm text-muted-foreground md:text-base">
          {description || identity.tagline}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge className="border-0 text-background" style={{ backgroundColor: "hsl(var(--game-accent))" }}>
            {category}
          </Badge>
          {platformTags.map((tag) => (
            <Badge key={tag} variant="outline" className="border-white/30 bg-black/40 text-white">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameChallengeHero;
