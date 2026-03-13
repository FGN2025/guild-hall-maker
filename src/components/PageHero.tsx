import { usePageHero } from "@/hooks/usePageHero";

interface PageHeroProps {
  pageSlug: string;
}

const PageHero = ({ pageSlug }: PageHeroProps) => {
  const { data: hero } = usePageHero(pageSlug);

  if (!hero || !hero.image_url) return null;

  return (
    <div className="relative w-full h-48 md:h-64 overflow-hidden rounded-xl mb-8">
      <img
        src={hero.image_url}
        alt={hero.title || `${pageSlug} hero`}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
      {(hero.title || hero.subtitle) && (
        <div className="absolute bottom-0 left-0 right-0 p-6">
          {hero.title && (
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground drop-shadow-lg">
              {hero.title}
            </h2>
          )}
          {hero.subtitle && (
            <p className="font-body text-sm text-muted-foreground mt-1 drop-shadow">
              {hero.subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PageHero;
