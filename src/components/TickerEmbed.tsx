import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import EmbeddedHtml from "@/components/shared/EmbeddedHtml";

const TickerEmbed = () => {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "homepage_ticker_embed")
      .maybeSingle()
      .then(({ data }) => setHtml(data?.value || null));
  }, []);

  if (!html) return null;

  return (
    <section className="w-full">
      <div className="container mx-auto px-4">
        <EmbeddedHtml
          html={html}
          className="rounded-xl border border-border overflow-hidden bg-card"
        />
      </div>
    </section>
  );
};

export default TickerEmbed;
