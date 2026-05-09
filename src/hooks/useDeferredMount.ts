import { useEffect, useState } from "react";

/**
 * Defers mounting until the browser is idle so heavy widgets
 * don't compete with first paint. Falls back to setTimeout where
 * requestIdleCallback isn't available (Safari).
 */
export const useDeferredMount = (delay = 1500) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const ric =
      (window as any).requestIdleCallback ??
      ((cb: () => void) => setTimeout(cb, delay));
    const cic =
      (window as any).cancelIdleCallback ?? ((id: number) => clearTimeout(id));
    const id = ric(() => setReady(true), { timeout: delay });
    return () => cic(id);
  }, [delay]);
  return ready;
};
