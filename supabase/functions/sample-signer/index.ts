// TEMPORARY: mints short-lived signed URLs for the Acme design-sample PNGs so
// reviewers can view them while the tenant-marketing bucket stays private.
// Delete after the design verdict.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const PREFIX = "41a2e493-079a-4a17-a3a9-aebdd5fe5f81/design-samples/";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const names = ["sample-portrait-v3.png", "sample-landscape-v3.png", "sample-square-v3.png"];
  const out: Record<string, string | null> = {};
  for (const n of names) {
    const { data } = await supabase.storage
      .from("tenant-marketing")
      .createSignedUrl(`${PREFIX}${n}`, 60 * 60 * 24 * 7);
    out[n] = data?.signedUrl ?? null;
  }
  return new Response(JSON.stringify(out, null, 2), {
    headers: { "content-type": "application/json" },
  });
});
