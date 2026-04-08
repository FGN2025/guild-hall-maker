import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify JWT and check admin role
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for creating users
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse optional batch_size and offset from body
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batch_size ?? 100;
    const dryRun = body.dry_run ?? false;
    const maxCount = body.max_count ?? 0; // 0 = process all

    // Fetch all unmatched legacy users with emails, deduplicated by email
    const allLegacy: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await adminClient
        .from("legacy_users")
        .select("id, legacy_username, email, tenant_id, zip_code")
        .is("matched_user_id", null)
        .not("email", "is", null)
        .order("legacy_username", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allLegacy.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    // Deduplicate by email (lowercase), pick first record per email
    const emailMap = new Map<string, any>();
    for (const row of allLegacy) {
      const em = row.email?.trim().toLowerCase();
      if (!em) continue;
      if (!emailMap.has(em)) {
        emailMap.set(em, row);
      }
    }

    let uniqueUsers = Array.from(emailMap.values());
    if (maxCount > 0) {
      uniqueUsers = uniqueUsers.slice(0, maxCount);
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        total_legacy: allLegacy.length,
        unique_emails: uniqueUsers.length,
        dry_run: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let created = 0;
    let skipped = 0;
    let autoMatched = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < uniqueUsers.length; i += batchSize) {
      const batch = uniqueUsers.slice(i, i + batchSize);

      for (const legacy of batch) {
        const em = legacy.email.trim().toLowerCase();
        try {
          // Try creating the user — if email exists, it'll fail and we auto-match
          const randomPassword = crypto.randomUUID() + "!Aa1";

          const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email: em,
            password: randomPassword,
            email_confirm: true,
            user_metadata: {
              display_name: legacy.legacy_username,
              legacy_id: legacy.id,
              zip_code: legacy.zip_code || undefined,
            },
          });

          if (createError) {
            if (createError.message?.includes("already been registered") ||
                createError.message?.includes("already exists")) {
              // Auto-match: find the existing auth user and link
              const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000, page: 1 });
              const existingUser = users?.find((u: any) => u.email?.toLowerCase() === em);
              if (existingUser) {
                await adminClient.from("legacy_users")
                  .update({ matched_user_id: existingUser.id, matched_at: new Date().toISOString() })
                  .eq("id", legacy.id);

                // Update gamer_tag if not set
                await adminClient.from("profiles")
                  .update({ gamer_tag: legacy.legacy_username })
                  .eq("user_id", existingUser.id)
                  .is("gamer_tag", null);

                autoMatched++;
              } else {
                skipped++;
              }
              continue;
            }
            errors.push(`${em}: ${createError.message}`);
            skipped++;
            continue;
          }

          if (!newUser?.user) {
            skipped++;
            continue;
          }

          const userId = newUser.user.id;

          // Update profile with legacy data
          await adminClient.from("profiles")
            .update({
              gamer_tag: legacy.legacy_username,
              zip_code: legacy.zip_code || undefined,
            })
            .eq("user_id", userId);

          // Create tenant linkage if tenant_id exists
          if (legacy.tenant_id) {
            await adminClient.from("user_service_interests").upsert({
              user_id: userId,
              tenant_id: legacy.tenant_id,
              zip_code: legacy.zip_code || "",
              status: "new",
            }, { onConflict: "user_id,tenant_id" }).select();
          }

          // Mark legacy record as matched
          await adminClient.from("legacy_users")
            .update({
              matched_user_id: userId,
              matched_at: new Date().toISOString(),
            })
            .eq("id", legacy.id);

          created++;
        } catch (err: any) {
          errors.push(`${em}: ${err.message}`);
          skipped++;
        }
      }
    }

    return new Response(JSON.stringify({
      created,
      skipped,
      auto_matched: autoMatched,
      total_processed: uniqueUsers.length,
      errors: errors.slice(0, 50),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
