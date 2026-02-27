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
