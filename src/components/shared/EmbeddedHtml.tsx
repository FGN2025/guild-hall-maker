import { useEffect, useMemo, useRef, useState } from "react";

interface EmbeddedHtmlProps {
  html: string;
  className?: string;
}

/**
 * Renders tenant-authored HTML inside a sandboxed iframe.
 *
 * Security: tenant staff can edit embed HTML, so we MUST isolate it from the
 * parent app. A sandboxed iframe with `allow-scripts` (but NOT `allow-same-origin`)
 * runs scripts in a null origin — no access to the parent's cookies,
 * localStorage, or Supabase session.
 */
const EmbeddedHtml = ({ html, className }: EmbeddedHtmlProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>(120);

  const srcDoc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>html,body{margin:0;padding:0;background:transparent;color:inherit;font-family:inherit}img,video,iframe{max-width:100%}</style></head><body>${html}<script>(function(){function r(){try{var h=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);parent.postMessage({__embedHeight:h},'*');}catch(e){}}r();new ResizeObserver(r).observe(document.body);window.addEventListener('load',r);})();</script></body></html>`,
    [html]
  );

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data as { __embedHeight?: number };
      if (data && typeof data.__embedHeight === "number") {
        setHeight(Math.max(40, Math.min(4000, Math.ceil(data.__embedHeight))));
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  if (!html) return null;

  return (
    <iframe
      ref={iframeRef}
      title="Embedded content"
      className={className}
      srcDoc={srcDoc}
      // sandbox without allow-same-origin = scripts run in null origin, cannot
      // touch parent cookies, localStorage, or Supabase session.
      sandbox="allow-scripts allow-popups allow-forms"
      style={{ width: "100%", height, border: 0, display: "block" }}
    />
  );
};

export default EmbeddedHtml;
