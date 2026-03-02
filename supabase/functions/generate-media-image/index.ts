import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AiImageConfig {
  provider: "lovable" | "custom";
  model: string;
  custom_api_url: string;
  custom_api_key: string;
  custom_model: string;
}

const DEFAULT_CONFIG: AiImageConfig = {
  provider: "lovable",
  model: "google/gemini-3-pro-image-preview",
  custom_api_url: "",
  custom_api_key: "",
  custom_model: "",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Verify user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, category = "general", tags = [] } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read AI image config from app_settings using service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let config: AiImageConfig = { ...DEFAULT_CONFIG };
    const { data: configRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ai_image_config")
      .maybeSingle();

    if (configRow?.value) {
      try {
        config = { ...DEFAULT_CONFIG, ...JSON.parse(configRow.value) };
      } catch { /* use defaults */ }
    }

    let apiUrl: string;
    let apiKey: string;
    let model: string;
    let requestBody: Record<string, unknown>;

    if (config.provider === "custom" && config.custom_api_url && config.custom_api_key && config.custom_model) {
      apiUrl = config.custom_api_url;
      apiKey = config.custom_api_key;
      model = config.custom_model;
      requestBody = {
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      };
    } else {
      // Lovable AI (default)
      if (!lovableApiKey) {
        return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      apiKey = lovableApiKey;
      model = config.model || DEFAULT_CONFIG.model;
      requestBody = {
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      };
    }

    // Call AI API
    const aiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await aiResponse.text();
      console.error("AI gateway error:", status, text);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();

    // Try Lovable gateway format first, then standard b64_json format
    let imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      // Try standard OpenAI b64_json response format
      const b64 = aiData.data?.[0]?.b64_json;
      if (b64) {
        imageData = `data:image/png;base64,${b64}`;
      }
    }

    if (!imageData) {
      return new Response(JSON.stringify({ error: "No image was generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract base64 data
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return new Response(JSON.stringify({ error: "Invalid image format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = base64Match[1];
    const base64 = base64Match[2];
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Upload to storage
    const fileName = `ai-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const filePath = `${category}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("app-media")
      .upload(filePath, bytes, { contentType: `image/${ext}`, upsert: false });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // Insert into media_library
    const { data: mediaRecord, error: insertError } = await supabase
      .from("media_library")
      .insert({
        user_id: user.id,
        file_name: fileName,
        file_path: filePath,
        file_type: "image",
        mime_type: `image/${ext}`,
        file_size: bytes.length,
        url: publicUrl,
        category,
        tags,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save media record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ media: mediaRecord }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-media-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
