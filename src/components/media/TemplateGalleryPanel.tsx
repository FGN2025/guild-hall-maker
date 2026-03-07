import { useRef, useEffect, useMemo } from "react";
import type { TemplateDefinition } from "@/hooks/canvas/canvasTypes";
import { Button } from "@/components/ui/button";
import { LayoutTemplate } from "lucide-react";

const BUILT_IN_TEMPLATES: TemplateDefinition[] = [
  {
    key: "event-banner",
    name: "Event Banner",
    description: "Title + date + tagline",
    zones: [
      { label: "Title", xPct: 0.05, yPct: 0.07, fontSize: 48, color: "#ffffff", fontFamily: "sans-serif", locked: true },
      { label: "Date", xPct: 0.05, yPct: 0.17, fontSize: 24, color: "#cccccc", fontFamily: "sans-serif" },
      { label: "CTA", xPct: 0.05, yPct: 0.23, fontSize: 20, color: "#00ff88", fontFamily: "sans-serif" },
    ],
    bgShape: { shape: "rect", xPct: 0, yPct: 0.85, wPct: 1, hPct: 0.15, fillColor: "rgba(0,0,0,0.6)", opacity: 0.8 },
  },
  {
    key: "tournament-promo",
    name: "Tournament Promo",
    description: "Prize pool + game + sign up",
    zones: [
      { label: "Tournament", xPct: 0.05, yPct: 0.05, fontSize: 52, color: "#ffffff", fontFamily: "sans-serif", locked: true },
      { label: "Prize", xPct: 0.05, yPct: 0.16, fontSize: 28, color: "#ffd700", fontFamily: "sans-serif" },
      { label: "Game", xPct: 0.05, yPct: 0.23, fontSize: 22, color: "#aaaaaa", fontFamily: "sans-serif" },
      { label: "CTA", xPct: 0.05, yPct: 0.30, fontSize: 20, color: "#00ccff", fontFamily: "sans-serif" },
    ],
  },
  {
    key: "social-post",
    name: "Social Media Post",
    description: "Centered headline + subtitle",
    zones: [
      { label: "Headline", xPct: 0.25, yPct: 0.25, fontSize: 44, color: "#ffffff", fontFamily: "sans-serif", locked: true },
      { label: "Subtitle", xPct: 0.28, yPct: 0.35, fontSize: 22, color: "#dddddd", fontFamily: "sans-serif" },
    ],
  },
  {
    key: "branded-corner",
    name: "Branded Corner",
    description: "Org name in bottom-right",
    zones: [
      { label: "Org Name", xPct: 0.63, yPct: 0.87, fontSize: 24, color: "#ffffff", fontFamily: "sans-serif", locked: true },
      { label: "Powered by", xPct: 0.66, yPct: 0.93, fontSize: 14, color: "#999999", fontFamily: "sans-serif" },
    ],
  },
  {
    key: "winner-announce",
    name: "Winner Announcement",
    description: "Congrats + winner name",
    zones: [
      { label: "Congrats", xPct: 0.19, yPct: 0.13, fontSize: 42, color: "#ffd700", fontFamily: "sans-serif", locked: true },
      { label: "Player", xPct: 0.31, yPct: 0.23, fontSize: 36, color: "#ffffff", fontFamily: "sans-serif" },
      { label: "Title", xPct: 0.28, yPct: 0.32, fontSize: 22, color: "#cccccc", fontFamily: "sans-serif" },
    ],
  },
];

interface TemplateGalleryPanelProps {
  canvasWidth: number;
  canvasHeight: number;
  onApply: (texts: Array<{ text: string; xPct: number; yPct: number; fontSize: number; color: string; fontFamily: string; x: number; y: number; locked?: boolean }>) => void;
}

function MiniPreview({ template, width, height }: { template: TemplateDefinition; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, width, height);

    // Background shape
    if (template.bgShape) {
      const bs = template.bgShape;
      ctx.globalAlpha = bs.opacity;
      ctx.fillStyle = bs.fillColor;
      ctx.fillRect(bs.xPct * width, bs.yPct * height, bs.wPct * width, bs.hPct * height);
      ctx.globalAlpha = 1;
    }

    // Text zones as colored bars
    template.zones.forEach((z) => {
      const x = z.xPct * width;
      const y = z.yPct * height;
      const scaledFontSize = Math.max(6, Math.round(z.fontSize * (width / 600)));
      ctx.fillStyle = z.color;
      ctx.globalAlpha = z.locked ? 1 : 0.7;
      // Draw a small text label
      ctx.font = `${scaledFontSize}px ${z.fontFamily}`;
      ctx.textBaseline = "top";
      ctx.fillText(z.label, x, y);
      if (z.locked) {
        // Small lock indicator
        ctx.fillStyle = "rgba(239,68,68,0.8)";
        const tw = ctx.measureText(z.label).width;
        ctx.fillRect(x + tw + 2, y + 1, scaledFontSize * 0.6, scaledFontSize * 0.6);
      }
      ctx.globalAlpha = 1;
    });
  }, [template, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded border border-border w-full"
      style={{ aspectRatio: `${width}/${height}` }}
    />
  );
}

const TemplateGalleryPanel = ({ canvasWidth, canvasHeight, onApply }: TemplateGalleryPanelProps) => {
  const previewW = 160;
  const previewH = useMemo(() => Math.round(previewW * (canvasHeight / canvasWidth)) || 100, [canvasWidth, canvasHeight]);

  const handleApply = (tpl: TemplateDefinition) => {
    const texts = tpl.zones.map((z) => ({
      text: z.label,
      xPct: z.xPct,
      yPct: z.yPct,
      fontSize: z.fontSize,
      color: z.color,
      fontFamily: z.fontFamily,
      x: Math.round(z.xPct * canvasWidth),
      y: Math.round(z.yPct * canvasHeight),
      locked: z.locked,
    }));
    onApply(texts);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-heading uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1.5">
        <LayoutTemplate className="h-3.5 w-3.5" /> Template Gallery
      </p>
      <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
        {BUILT_IN_TEMPLATES.map((tpl) => (
          <button
            key={tpl.key}
            className="group text-left rounded-lg border border-border hover:border-primary/50 transition-all overflow-hidden bg-card hover:bg-accent/30"
            onClick={() => handleApply(tpl)}
          >
            <MiniPreview template={tpl} width={previewW} height={previewH} />
            <div className="px-2.5 py-1.5">
              <span className="text-sm font-medium text-foreground block">{tpl.name}</span>
              <span className="text-[11px] text-muted-foreground">{tpl.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TemplateGalleryPanel;
