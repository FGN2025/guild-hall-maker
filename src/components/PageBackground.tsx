import { usePageBackground } from "@/hooks/usePageBackground";

interface PageBackgroundProps {
  pageSlug: string;
}

const PageBackground = ({ pageSlug }: PageBackgroundProps) => {
  const { data: bg } = usePageBackground(pageSlug);

  if (!bg) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <img
        src={bg.image_url}
        alt=""
        className="w-full h-full object-cover"
        style={{ opacity: bg.opacity }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
    </div>
  );
};

export default PageBackground;
