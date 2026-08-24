import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (step: string, details?: unknown) => {
  console.log(`[PROVISION-SUB-TENANT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    // ---- Authenticate caller ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated" }, 401);

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const caller = userData?.user;
    if (userErr || !caller) return json({ error: "Not authenticated" }, 401);

    // ---- Validate input ----
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request body" }, 400);

    const parentTenantId = String(body.parentTenantId ?? "").trim();
    const name = String(body.name ?? "").trim();
    const slugInput = String(body.slug ?? "").trim().toLowerCase();
    const contactEmail = body.contactEmail ? String(body.contactEmail).trim() : null;
    const logoUrl = body.logoUrl ? String(body.logoUrl).trim() : null;
    const primaryColor = body.primaryColor ? String(body.primaryColor).trim() : null;
    const accentColor = body.accentColor ? String(body.accentColor).trim() : null;
    const managerUserId = body.managerUserId ? String(body.managerUserId).trim() : null;
    const managerEmail = body.managerEmail ? String(body.managerEmail).trim().toLowerCase() : null;

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(parentTenantId)) return json({ error: "A valid parent account is required" }, 400);
    if (name.length < 2 || name.length > 120) return json({ error: "Name must be 2-120 characters" }, 400);
    if (managerUserId && !uuidRe.test(managerUserId)) return json({ error: "Invalid manager selection" }, 400);
    if (managerEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(managerEmail)) {
      return json({ error: "Invalid manager email" }, 400);
    }
    if (!managerUserId && !managerEmail) {
      return json({ error: "Nominate a manager for the sub-account (existing user or email invite)" }, 400);
    }

    // ---- Authorize: platform admin OR admin on the parent tenant ----
    const { data: isPlatformAdmin } = await admin.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    let callerIsParentAdmin = false;
    if (!isPlatformAdmin) {
      const { data: membership } = await admin
        .from("tenant_admins")
        .select("role")
        .eq("tenant_id", parentTenantId)
        .eq("user_id", caller.id)
        .maybeSingle();
      callerIsParentAdmin = membership?.role === "admin";
    }

    if (!isPlatformAdmin && !callerIsParentAdmin) {
      return json({ error: "You do not have permission to create sub-accounts for this provider" }, 403);
    }

    // ---- Parent must exist and must itself be top-level ----
    const { data: parent, error: parentErr } = await admin
      .from("tenants")
      .select("id, name, parent_tenant_id")
      .eq("id", parentTenantId)
      .maybeSingle();
    if (parentErr) throw parentErr;
    if (!parent) return json({ error: "Parent account not found" }, 404);
    if (parent.parent_tenant_id) {
      return json({ error: "Sub-accounts cannot have their own sub-accounts" }, 400);
    }

    // ---- Slug ----
    const baseSlug =
      (slugInput || name)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 50) || "sub-account";

    let slug = baseSlug;
    for (let attempt = 1; attempt < 50; attempt++) {
      const { data: existing } = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${attempt}`;
    }

    // ---- Create the sub-tenant ----
    const { data: sub, error: subErr } = await admin
      .from("tenants")
      .insert({
        name,
        slug,
        parent_tenant_id: parentTenantId,
        contact_email: contactEmail,
        logo_url: logoUrl,
        primary_color: primaryColor,
        accent_color: accentColor,
        status: "active",
      })
      .select("id, name, slug, parent_tenant_id")
      .single();

    if (subErr) {
      log("sub tenant insert failed", { error: subErr.message });
      return json({ error: `Failed to create sub-account: ${subErr.message}` }, 400);
    }
    log("created sub tenant", { id: sub.id, slug });

    const rollback = async (reason: string, status = 400) => {
      await admin.from("tenant_admins").delete().eq("tenant_id", sub.id);
      await admin.from("tenants").delete().eq("id", sub.id);
      log("rolled back", { reason });
      return json({ error: reason }, status);
    };

    // ---- Seat 1: the acting parent admin (skip if platform admin with no parent seat) ----
    const seats: Array<{ user_id: string; role: string; source: string }> = [];

    let parentAdminUserId: string | null = callerIsParentAdmin ? caller.id : null;
    if (!parentAdminUserId) {
      // Platform admin acting on behalf: seed the parent's first admin instead.
      const { data: parentAdminRow } = await admin
        .from("tenant_admins")
        .select("user_id")
        .eq("tenant_id", parentTenantId)
        .eq("role", "admin")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      parentAdminUserId = parentAdminRow?.user_id ?? null;
    }

    if (parentAdminUserId) {
      seats.push({ user_id: parentAdminUserId, role: "manager", source: "seeded_from_parent" });
    }

    // ---- Seat 2: the nominated manager ----
    let invitationCreated = false;
    if (managerUserId && managerUserId !== parentAdminUserId) {
      seats.push({ user_id: managerUserId, role: "manager", source: "direct" });
    }

    if (seats.length > 0) {
      const { error: seatErr } = await admin
        .from("tenant_admins")
        .insert(seats.map((s) => ({ ...s, tenant_id: sub.id })));
      if (seatErr) {
        return await rollback(`Failed to seat managers: ${seatErr.message}`);
      }
    }

    if (!managerUserId && managerEmail) {
      const { error: inviteErr } = await admin.from("tenant_invitations").insert({
        tenant_id: sub.id,
        email: managerEmail,
        role: "manager",
        invited_by: caller.id,
      });
      if (inviteErr) {
        return await rollback(`Failed to invite manager: ${inviteErr.message}`);
      }
      invitationCreated = true;

      try {
        await admin.functions.invoke("send-tenant-invite", {
          body: {
            email: managerEmail,
            tenantName: sub.name,
            role: "manager",
            invitedBy: caller.email,
            tenantSlug: sub.slug,
          },
        });
      } catch (e) {
        log("invite email failed (non-fatal)", { error: String(e) });
      }
    }

    return json({
      success: true,
      tenant: sub,
      seatedManagers: seats.length,
      invitationCreated,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return json({ error: msg }, 500);
  }
});
