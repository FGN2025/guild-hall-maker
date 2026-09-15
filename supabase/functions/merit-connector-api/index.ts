// Merit Connector API — inbound receiver for the Scout Merit Builder companion app (Stop 7).
// Auth: static ecosystem key (X-Ecosystem-Key vs ECOSYSTEM_API_KEY) with X-Ecosystem-App: merit.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

const SERVICE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ECOSYSTEM_KEY = Deno.env.get('ECOSYSTEM_API_KEY') ?? ''

const PassportEntrySchema = z
  .object({
    external_user_id: z.string().uuid().optional(),
    user_email: z.string().email().optional(),
    badge_slug: z.string().min(1).max(200),
    completed_at: z.string().datetime({ offset: true }).or(z.string().datetime()),
    decided_by_email: z.string().email().optional(),
    note: z.string().max(2000).optional(),
    source: z.string().max(100).optional(),
  })
  .refine((e) => Boolean(e.external_user_id) !== Boolean(e.user_email), {
    message: 'provide exactly one of external_user_id or user_email',
  })

const BodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('health') }),
  z.object({
    action: z.literal('passport_entries'),
    delivery_id: z.string().min(1).max(200),
    validate_only: z.boolean().optional().default(false),
    entries: z.array(PassportEntrySchema).min(1).max(500),
  }),
])

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function unauthorized(reason: string) {
  return json(401, { error: reason })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Ecosystem key auth (same pattern as ecosystem-data-api).
  const providedKey = req.headers.get('x-ecosystem-key') ?? ''
  const providedApp = req.headers.get('x-ecosystem-app') ?? ''
  if (!ECOSYSTEM_KEY || providedKey !== ECOSYSTEM_KEY) return unauthorized('invalid ecosystem key')
  if (providedApp !== 'merit') return unauthorized('unsupported ecosystem app (expected: merit)')

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return json(400, { error: 'invalid JSON body' })
  }

  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return json(400, { error: 'validation failed', details: parsed.error.flatten() })
  }
  const body = parsed.data

  const admin = createClient(SERVICE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  if (body.action === 'health') {
    return json(200, { ok: true, service: 'merit-connector-api', time: new Date().toISOString() })
  }

  // ---- passport_entries ----
  const results: Array<Record<string, unknown>> = []

  if (!body.validate_only) {
    // Idempotency: claim the delivery_id first; a replay is rejected outright.
    const claim = await admin
      .from('merit_connector_deliveries')
      .insert({ delivery_id: body.delivery_id, source_app: 'scout_merit_builder', entries_count: body.entries.length })
      .select('id')
      .single()
    if (claim.error) {
      if ((claim.error as { code?: string }).code === '23505') {
        return json(409, { status: 'duplicate', delivery_id: body.delivery_id })
      }
      return json(500, { error: 'failed to record delivery', details: claim.error.message })
    }
  }

  let accepted = 0

  for (let i = 0; i < body.entries.length; i++) {
    const entry = body.entries[i]
    const base = {
      index: i,
      badge_slug: entry.badge_slug,
      external_user_id: entry.external_user_id ?? null,
      user_email: entry.user_email ?? null,
    }
    try {
      // Resolve the fgn.gg user.
      let userId = entry.external_user_id ?? null
      if (!userId && entry.user_email) {
        // Page the admin list for the email (small page size, capped loop).
        let found: string | null = null
        for (let page = 1; page <= 10 && !found; page++) {
          const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 })
          if (error) throw new Error(`user lookup failed: ${error.message}`)
          found = data.users.find((u) => (u.email ?? '').toLowerCase() === entry.user_email!.toLowerCase())?.id ?? null
          if (data.users.length < 500) break
        }
        if (!found) throw new Error('no fgn.gg account found for user_email')
        userId = found
      } else if (userId) {
        const { error } = await admin.auth.admin.getUserById(userId)
        if (error) throw new Error('external_user_id does not match a fgn.gg account')
      }
      if (!userId) throw new Error('unresolvable user')

      // Resolve the badge by slug.
      const { data: badge, error: badgeErr } = await admin
        .from('official_badges')
        .select('id, name, is_retired')
        .eq('slug', entry.badge_slug)
        .maybeSingle()
      if (badgeErr) throw new Error(`badge lookup failed: ${badgeErr.message}`)
      if (!badge) throw new Error(`unknown badge_slug '${entry.badge_slug}'`)
      if (badge.is_retired) throw new Error(`badge '${entry.badge_slug}' is retired`)

      // Resolve the user's tenant.
      const { data: tenantId, error: tenantErr } = await admin.rpc('get_user_tenant', { _user_id: userId })
      if (tenantErr) throw new Error(`tenant lookup failed: ${tenantErr.message}`)
      if (!tenantId) throw new Error('user has no tenant membership; advancement record requires a tenant')

      // Upsert advancement record (unique on tenant_id, scout_user_id, badge_id).
      const { data: existing } = await admin
        .from('advancement_records')
        .select('id, digital_completed_at, notes')
        .eq('tenant_id', tenantId)
        .eq('scout_user_id', userId)
        .eq('badge_id', badge.id)
        .maybeSingle()

      const completedAt = new Date(entry.completed_at).toISOString()
      const noteBits = [
        `[scout_merit_builder${entry.source ? ` via ${entry.source}` : ''}] merit recorded ${completedAt}`,
        entry.decided_by_email ? `decided by ${entry.decided_by_email}` : null,
        entry.note ?? null,
      ].filter(Boolean)
      const mergedNotes = existing?.notes ? `${existing.notes}\n${noteBits.join('; ')}` : noteBits.join('; ')

      if (existing) {
        const keepEarlier =
          !existing.digital_completed_at ||
          (completedAt && new Date(completedAt) < new Date(existing.digital_completed_at))
        const { data: updated, error: updErr } = await admin
          .from('advancement_records')
          .update({
            digital_completed_at: keepEarlier ? completedAt : existing.digital_completed_at,
            recorded_externally_at: new Date().toISOString(),
            recorded_externally_by: userId,
            notes: mergedNotes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('id')
          .single()
        if (updErr) throw new Error(`advancement update failed: ${updErr.message}`)
        results.push({ ...base, outcome: 'accepted', advancement_record_id: updated!.id })
      } else {
        const { data: inserted, error: insErr } = await admin
          .from('advancement_records')
          .insert({
            tenant_id: tenantId,
            scout_user_id: userId,
            badge_id: badge.id,
            digital_completed_at: completedAt,
            recorded_externally_at: new Date().toISOString(),
            recorded_externally_by: userId,
            notes: mergedNotes,
          })
          .select('id')
          .single()
        if (insErr) throw new Error(`advancement insert failed: ${insErr.message}`)
        results.push({ ...base, outcome: 'accepted', advancement_record_id: inserted!.id })
      }

      accepted++

      // Queue the debounced Skill Passport refresh toward fgn.academy.
      const { error: qErr } = await admin.rpc('enqueue_passport_refresh', { _user_id: userId })
      if (qErr) {
        results[results.length - 1].passport_refresh_warning = `enqueue failed: ${qErr.message}`
      }
    } catch (e) {
      results.push({ ...base, outcome: 'failed', reason: e instanceof Error ? e.message : String(e) })
    }
  }

  // Audit log (always, including validate_only).
  const failedCount = results.filter((r) => r.outcome === 'failed').length
  await admin.from('ecosystem_sync_log').insert({
    target_app: 'scout_merit_builder',
    data_type: 'passport_entries',
    records_synced: accepted,
    status: body.validate_only ? 'validate_only' : failedCount === 0 ? 'success' : 'partial',
    error_message: failedCount > 0 ? `${failedCount} of ${results.length} entries failed` : null,
  })

  return json(200, {
    status: body.validate_only ? 'validated' : 'ok',
    delivery_id: body.delivery_id,
    results,
  })
})
