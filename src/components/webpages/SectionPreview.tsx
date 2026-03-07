import { WebPageSection } from "@/hooks/useWebPages";
import ReactMarkdown from "react-markdown";

interface Props {
  section: WebPageSection;
}

const SectionPreview = ({ section }: Props) => {
  const c = section.config;

  switch (section.section_type) {
    case "hero":
      return (
        <div className="relative min-h-[240px] flex items-center justify-center overflow-hidden rounded-lg">
          {c.image_url && (
            <img src={c.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div
            className="absolute inset-0 bg-background"
            style={{ opacity: c.overlay_opacity ?? 0.5 }}
          />
          <div className="relative z-10 text-center p-8 space-y-3">
            {c.heading && <h2 className="font-display text-3xl font-bold text-foreground">{c.heading}</h2>}
            {c.subheading && <p className="text-lg text-muted-foreground">{c.subheading}</p>}
            {c.cta_text && (
              <a href={c.cta_url || "#"} className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-heading font-semibold text-sm">
                {c.cta_text}
              </a>
            )}
          </div>
        </div>
      );

    case "text_block":
      return (
        <div className={`py-6 px-4 ${c.alignment === "center" ? "text-center" : c.alignment === "right" ? "text-right" : "text-left"}`}>
          {c.heading && <h3 className="font-display text-2xl font-bold text-foreground mb-3">{c.heading}</h3>}
          {c.body && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{c.body}</ReactMarkdown>
            </div>
          )}
        </div>
      );

    case "image_gallery": {
      const items = (c.items || []) as { image_url: string; caption?: string }[];
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
          {items.map((item, i) => (
            <div key={i} className="space-y-1">
              <img src={item.image_url} alt={item.caption || ""} className="rounded-lg w-full aspect-video object-cover" />
              {item.caption && <p className="text-xs text-muted-foreground text-center">{item.caption}</p>}
            </div>
          ))}
          {items.length === 0 && <p className="col-span-full text-center text-muted-foreground text-sm py-8">No images added yet</p>}
        </div>
      );
    }

    case "cta":
      return (
        <div
          className="rounded-lg p-8 text-center space-y-3"
          style={{ backgroundColor: c.background_color || "hsl(var(--primary) / 0.1)" }}
        >
          {c.image_url && <img src={c.image_url} alt="" className="h-16 mx-auto mb-4 object-contain" />}
          {c.heading && <h3 className="font-display text-2xl font-bold text-foreground">{c.heading}</h3>}
          {c.body && <p className="text-muted-foreground">{c.body}</p>}
          {c.button_text && (
            <a href={c.button_url || "#"} className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-heading font-semibold text-sm">
              {c.button_text}
            </a>
          )}
        </div>
      );

    case "embed_widget":
      return (
        <div className="p-4">
          {c.label && <p className="text-sm font-heading text-muted-foreground mb-2">{c.label}</p>}
          {c.embed_code ? (
            <div dangerouslySetInnerHTML={{ __html: c.embed_code }} className="rounded-lg overflow-hidden" />
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm">No embed code</div>
          )}
        </div>
      );

    case "banner":
      return (
        <div className="p-4">
          {c.image_url ? (
            <a href={c.link_url || "#"} className="block">
              <img src={c.image_url} alt={c.alt_text || ""} className="w-full rounded-lg object-cover max-h-[200px]" />
            </a>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm">No banner image</div>
          )}
        </div>
      );

    case "video":
      return (
        <div className="p-4 space-y-2">
          {c.video_url ? (
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <iframe src={c.video_url} className="w-full h-full" allowFullScreen title={c.caption || "Video"} />
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm">No video URL</div>
          )}
          {c.caption && <p className="text-sm text-muted-foreground text-center">{c.caption}</p>}
        </div>
      );

    default:
      return <div className="p-4 text-muted-foreground text-sm">Unknown section type: {section.section_type}</div>;
  }
};

export default SectionPreview;
