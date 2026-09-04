import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SDK_URL = "https://cdn.commoninja.com/sdk/latest/commonninja.js";
const SDK_ID = "commonninja-sdk";

/** Load the Common Ninja SDK once per page load (scripts injected via
 *  dangerouslySetInnerHTML do not execute, so the SDK must be added to <head>). */
const ensureSdk = () => {
  if (document.getElementById(SDK_ID)) return;
  const script = document.createElement("script");
  script.id = SDK_ID;
  script.src = SDK_URL;
  script.defer = true;
  document.head.appendChild(script);
};

/**
 * Renders the ticker embed stored in app_settings.homepage_ticker_embed
 * (managed from Admin Settings). Used on the homepage and the Tournaments
 * page. Renders nothing when the setting is empty.
 */
const TickerEmbed = () => {
  const [embedHtml, setEmbedHtml] = useState<string>("");

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "homepage_ticker_embed")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          setEmbedHtml(data.value);
          ensureSdk();
        }
      });
  }, []);

  if (!embedHtml) return null;

  return (
    <div
      className="ticker-embed w-full rounded-xl border border-white/60 bg-white/90 p-3 shadow-lg backdrop-blur-sm my-4"
      // Setting is admin-write-only; safe to render raw.
      dangerouslySetInnerHTML={{ __html: embedHtml }}
    />
  );
};

export default TickerEmbed;
