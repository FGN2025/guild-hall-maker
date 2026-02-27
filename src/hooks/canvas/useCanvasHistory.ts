import { useState, useCallback, useRef } from "react";
import type { Overlay } from "./canvasTypes";

const MAX_HISTORY = 50;

export function useCanvasHistory() {
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const historyRef = useRef<Overlay[][]>([[]]);
  const indexRef = useRef(0);

  const pushState = useCallback((next: Overlay[]) => {
    // Truncate any redo states
    historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
    historyRef.current.push(next);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      indexRef.current += 1;
    }
    setOverlays(next);
  }, []);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    setOverlays(historyRef.current[indexRef.current]);
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current += 1;
    setOverlays(historyRef.current[indexRef.current]);
  }, []);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  // For drag (live preview without pushing history)
  const setOverlaysLive = setOverlays;

  return { overlays, pushState, setOverlaysLive, undo, redo, canUndo, canRedo };
}
