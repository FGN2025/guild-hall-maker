export type LogoOverlay = {
  id: string;
  type: "logo";
  src: string;
  img: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TextOverlay = {
  id: string;
  type: "text";
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
};

export type Overlay = LogoOverlay | TextOverlay;

export type SnapGuide = {
  orientation: "horizontal" | "vertical";
  position: number;
};

export type CanvasFormat = {
  key: string;
  label: string;
  displayWidth: number;
  displayHeight: number;
  exportWidth: number;
  exportHeight: number;
};

export const CANVAS_FORMATS: CanvasFormat[] = [
  { key: "original", label: "Original", displayWidth: 0, displayHeight: 0, exportWidth: 0, exportHeight: 0 },
  { key: "square", label: "Square", displayWidth: 540, displayHeight: 540, exportWidth: 1080, exportHeight: 1080 },
  { key: "landscape", label: "Landscape", displayWidth: 600, displayHeight: 314, exportWidth: 1200, exportHeight: 628 },
  { key: "portrait", label: "Portrait", displayWidth: 400, displayHeight: 500, exportWidth: 1080, exportHeight: 1350 },
  { key: "story", label: "Story", displayWidth: 270, displayHeight: 480, exportWidth: 1080, exportHeight: 1920 },
];
