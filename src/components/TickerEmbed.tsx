import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const COMMONNINJA_SDK = "https://cdn.commoninja.com/sdk/latest/commonninja.js";

const TickerEmbed = () => {
  const [html, setHtml] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "homepage_ticker_embed")
      .maybeSingle()
      .then(({ data }) => setHtml(data?.value || null));
  }, []);

  useEffect(() => {
    if (!html) return;

    // Ensure SDK script is loaded once
    if (!document.querySelector(`script[src="${COMMONNINJA_SDK}"]`)) {
      const s = document.createElement("script");
      s.src = COMMONNINJA_SDK;
      s.defer = true;
      document.head.appendChild(s);
    }

    // Re-trigger CommonNinja initialization after React renders the embed div
    const timer = setTimeout(() => {
      const existing = document.querySelector(`script[src="${COMMONNINJA_SDK}"]`);
      if (existing) {
        const s = document.createElement("script");
        s.src = COMMONNINJA_SDK;
        s.defer = true;
        existing.remove();
        document.head.appendChild(s);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [html]);

  if (!html) return null;

  return (
    <section className="w-full">
      <div className="container mx-auto px-6 md:px-10 lg:px-16">
        <div
          ref={containerRef}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </section>
  );
};

export default TickerEmbed;
