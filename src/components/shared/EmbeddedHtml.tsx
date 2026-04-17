import { useEffect, useRef } from "react";

interface EmbeddedHtmlProps {
  html: string;
  className?: string;
}

/**
 * Renders raw HTML and rehydrates any <script> tags so they actually execute.
 *
 * Browsers treat <script> tags injected via innerHTML / dangerouslySetInnerHTML
 * as inert. This component walks the injected DOM, clones each <script> into a
 * real DOM script element (preserving src/type/async/defer + inline content),
 * and replaces the inert one — which forces the browser to execute it.
 *
 * Trust boundary: embed HTML is authored by tenant staff (RLS-protected);
 * same trust as today's dangerouslySetInnerHTML usage.
 */
const EmbeddedHtml = ({ html, className }: EmbeddedHtmlProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Inject the markup (scripts will be inert at this point)
    container.innerHTML = html;

    // Rehydrate every <script> so the browser executes it
    const scripts = Array.from(container.querySelectorAll("script"));
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");

      // Copy all attributes (src, type, async, defer, data-*, etc.)
      for (const attr of Array.from(oldScript.attributes)) {
        try {
          newScript.setAttribute(attr.name, attr.value);
        } catch {
          // ignore invalid attribute names
        }
      }

      // Copy inline script content
      if (oldScript.textContent) {
        newScript.textContent = oldScript.textContent;
      }

      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    return () => {
      // Clear on unmount so widgets don't leak listeners / duplicate on remount
      if (container) container.innerHTML = "";
    };
  }, [html]);

  return <div ref={containerRef} className={className} />;
};

export default EmbeddedHtml;
