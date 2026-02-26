import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ── Color math helpers ── */

function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

function hexToHsv(hex: string): [number, number, number] {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return [0, 0, 1];
  const [r, g, b] = m.map((c) => parseInt(c, 16) / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

function isValidHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

const PRESET_SWATCHES = [
  "#00e5ff", "#7c3aed", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#ec4899", "#14b8a6", "#6366f1",
];

/* ── Saturation-Value Panel ── */

function SatValPanel({
  hue, sat, val, onChange,
}: { hue: number; sat: number; val: number; onChange: (s: number, v: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    // base hue
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(0, 0, w, h);
    // white gradient left→right
    const gw = ctx.createLinearGradient(0, 0, w, 0);
    gw.addColorStop(0, "rgba(255,255,255,1)");
    gw.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gw;
    ctx.fillRect(0, 0, w, h);
    // black gradient top→bottom
    const gb = ctx.createLinearGradient(0, 0, 0, h);
    gb.addColorStop(0, "rgba(0,0,0,0)");
    gb.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = gb;
    ctx.fillRect(0, 0, w, h);
  }, [hue]);

  useEffect(() => { draw(); }, [draw]);

  const pick = useCallback((e: React.MouseEvent | MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    onChange(s, v);
  }, [onChange]);

  useEffect(() => {
    const up = () => { dragging.current = false; };
    const move = (e: MouseEvent) => { if (dragging.current) pick(e); };
    window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", move);
    return () => { window.removeEventListener("mouseup", up); window.removeEventListener("mousemove", move); };
  }, [pick]);

  return (
    <div className="relative w-full aspect-[4/3] rounded-md overflow-hidden cursor-crosshair border border-border">
      <canvas
        ref={canvasRef}
        width={200}
        height={150}
        className="w-full h-full"
        onMouseDown={(e) => { dragging.current = true; pick(e); }}
      />
      <div
        className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${sat * 100}%`, top: `${(1 - val) * 100}%` }}
      />
    </div>
  );
}

/* ── Hue Slider ── */

function HueSlider({ hue, onChange }: { hue: number; onChange: (h: number) => void }) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const pick = useCallback((e: React.MouseEvent | MouseEvent) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onChange(ratio * 360);
  }, [onChange]);

  useEffect(() => {
    const up = () => { dragging.current = false; };
    const move = (e: MouseEvent) => { if (dragging.current) pick(e); };
    window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", move);
    return () => { window.removeEventListener("mouseup", up); window.removeEventListener("mousemove", move); };
  }, [pick]);

  return (
    <div
      ref={barRef}
      className="relative w-full h-3 rounded-full cursor-pointer border border-border"
      style={{ background: "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)" }}
      onMouseDown={(e) => { dragging.current = true; pick(e); }}
    >
      <div
        className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${(hue / 360) * 100}%`, backgroundColor: `hsl(${hue}, 100%, 50%)` }}
      />
    </div>
  );
}

/* ── Main ColorPicker ── */

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const safeHex = isValidHex(value) ? value : "#00e5ff";
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(safeHex));
  const [hexInput, setHexInput] = useState(safeHex);

  // Sync from external value changes
  useEffect(() => {
    if (isValidHex(value)) {
      const newHsv = hexToHsv(value);
      setHsv(newHsv);
      setHexInput(value);
    }
  }, [value]);

  const emitColor = useCallback((h: number, s: number, v: number) => {
    setHsv([h, s, v]);
    const hex = hsvToHex(h, s, v);
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  const handleHexCommit = () => {
    const normalized = hexInput.startsWith("#") ? hexInput : `#${hexInput}`;
    if (isValidHex(normalized)) {
      const [h, s, v] = hexToHsv(normalized);
      setHsv([h, s, v]);
      onChange(normalized.toLowerCase());
      setHexInput(normalized.toLowerCase());
    } else {
      setHexInput(isValidHex(value) ? value : "#00e5ff");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-10 w-10 rounded-md border border-input cursor-pointer ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
          )}
          style={{ backgroundColor: safeHex }}
          aria-label="Pick color"
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3 p-3" align="start">
        <SatValPanel
          hue={hsv[0]}
          sat={hsv[1]}
          val={hsv[2]}
          onChange={(s, v) => emitColor(hsv[0], s, v)}
        />
        <HueSlider hue={hsv[0]} onChange={(h) => emitColor(h, hsv[1], hsv[2])} />
        <div className="flex flex-wrap gap-1.5">
          {PRESET_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              className={cn(
                "h-6 w-6 rounded-md border cursor-pointer transition-transform hover:scale-110",
                safeHex.toLowerCase() === c ? "border-foreground ring-1 ring-ring" : "border-border"
              )}
              style={{ backgroundColor: c }}
              onClick={() => {
                const [h, s, v] = hexToHsv(c);
                emitColor(h, s, v);
              }}
              aria-label={`Select color ${c}`}
            />
          ))}
        </div>
        <Input
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={handleHexCommit}
          onKeyDown={(e) => e.key === "Enter" && handleHexCommit()}
          className="font-mono text-sm h-8"
          placeholder="#000000"
        />
      </PopoverContent>
    </Popover>
  );
}
