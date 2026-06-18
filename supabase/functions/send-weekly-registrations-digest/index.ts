// Scheduled trigger: invoked weekly by pg_cron on Fridays at 23:00 UTC (4 PM PT in DST, 3 PM PT in standard time).
// Aggregates the last 7 days of registrations across tournaments, quests, and challenges,
// then invokes send-transactional-email with the weekly-registrations-digest template.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

interface Registrant {
  displayName: string
  handle: string | null
  registeredAt: string
}
interface Group {
  name: string
  subtitle?: string | null
  registrants: Registrant[]
}

const PT_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})
const PT_DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

function fmtPT(iso: string): string {
  return PT_FMT.format(new Date(iso)) + ' PT'
}

function profileLabel(p: any): { displayName: string; handle: string | null } {
  const displayName = p?.display_name || p?.gamer_tag || 'Unknown player'
  const handle = p?.gamer_tag && p.gamer_tag !== displayName ? p.gamer_tag : null
  return { displayName, handle }
}

function groupBy<T>(rows: T[], keyFn: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const r of rows) {
    const k = keyFn(r)
    const arr = m.get(k) ?? []
    arr.push(r)
    m.set(k, arr)
  }
  return m
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'Server configuration error' }, 500)

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const now = new Date()
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const sinceIso = since.toISOString()
  const todayKey = now.toISOString().slice(0, 10)

  try {
    // Tournaments
    const { data: tReg, error: tErr } = await supabase
      .from('tournament_registrations')
      .select('registered_at, user_id, tournament:tournaments(id,name,game), profile:profiles!tournament_registrations_user_id_fkey(display_name,gamer_tag)')
      .gte('registered_at', sinceIso)
      .order('registered_at', { ascending: true })
    if (tErr) throw tErr

    // Quests
    const { data: qReg, error: qErr } = await supabase
      .from('quest_enrollments')
      .select('enrolled_at, user_id, quest:quests(id,name), profile:profiles!quest_enrollments_user_id_fkey(display_name,gamer_tag)')
      .gte('enrolled_at', sinceIso)
      .order('enrolled_at', { ascending: true })
    if (qErr) throw qErr

    // Challenges
    const { data: cReg, error: cErr } = await supabase
      .from('challenge_enrollments')
      .select('enrolled_at, user_id, challenge:challenges(id,name), profile:profiles!challenge_enrollments_user_id_fkey(display_name,gamer_tag)')
      .gte('enrolled_at', sinceIso)
      .order('enrolled_at', { ascending: true })
    if (cErr) throw cErr

    const tournamentGroups: Group[] = [...groupBy(tReg ?? [], (r: any) => r.tournament?.id ?? 'unknown').entries()]
      .map(([, rows]) => {
        const first: any = rows[0]
        const t = first.tournament
        return {
          name: t?.name ?? 'Unknown tournament',
          subtitle: t?.game ?? null,
          registrants: rows.map((r: any) => ({ ...profileLabel(r.profile), registeredAt: fmtPT(r.registered_at) })),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    const questGroups: Group[] = [...groupBy(qReg ?? [], (r: any) => r.quest?.id ?? 'unknown').entries()]
      .map(([, rows]) => {
        const first: any = rows[0]
        return {
          name: first.quest?.name ?? 'Unknown quest',
          registrants: rows.map((r: any) => ({ ...profileLabel(r.profile), registeredAt: fmtPT(r.enrolled_at) })),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    const challengeGroups: Group[] = [...groupBy(cReg ?? [], (r: any) => r.challenge?.id ?? 'unknown').entries()]
      .map(([, rows]) => {
        const first: any = rows[0]
        return {
          name: first.challenge?.name ?? 'Unknown challenge',
          registrants: rows.map((r: any) => ({ ...profileLabel(r.profile), registeredAt: fmtPT(r.enrolled_at) })),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    const totals = {
      tournaments: (tReg ?? []).length,
      quests: (qReg ?? []).length,
      challenges: (cReg ?? []).length,
    }

    const windowLabel = `${PT_DATE.format(since)} → ${PT_DATE.format(now)} PT`

    const { data, error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'weekly-registrations-digest',
        idempotencyKey: `weekly-registrations-${todayKey}`,
        templateData: {
          windowLabel,
          tournaments: tournamentGroups,
          quests: questGroups,
          challenges: challengeGroups,
          totals,
        },
      },
    })

    if (error) {
      console.error('Failed to send weekly registrations digest', error)
      return json({ ok: false, error: error.message }, 500)
    }

    return json({ ok: true, date: todayKey, totals, result: data })
  } catch (e) {
    console.error('Digest build failed', e)
    return json({ ok: false, error: (e as Error).message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
