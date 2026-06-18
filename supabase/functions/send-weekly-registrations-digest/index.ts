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

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
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
    const [tRegRes, qRegRes, cRegRes] = await Promise.all([
      supabase
        .from('tournament_registrations')
        .select('registered_at, user_id, tournament_id')
        .gte('registered_at', sinceIso)
        .order('registered_at', { ascending: true }),
      supabase
        .from('quest_enrollments')
        .select('enrolled_at, user_id, quest_id')
        .gte('enrolled_at', sinceIso)
        .order('enrolled_at', { ascending: true }),
      supabase
        .from('challenge_enrollments')
        .select('enrolled_at, user_id, challenge_id')
        .gte('enrolled_at', sinceIso)
        .order('enrolled_at', { ascending: true }),
    ])
    if (tRegRes.error) throw tRegRes.error
    if (qRegRes.error) throw qRegRes.error
    if (cRegRes.error) throw cRegRes.error

    const tReg = tRegRes.data ?? []
    const qReg = qRegRes.data ?? []
    const cReg = cRegRes.data ?? []

    const userIds = uniq([...tReg, ...qReg, ...cReg].map((r: any) => r.user_id).filter(Boolean))
    const tournamentIds = uniq(tReg.map((r: any) => r.tournament_id).filter(Boolean))
    const questIds = uniq(qReg.map((r: any) => r.quest_id).filter(Boolean))
    const challengeIds = uniq(cReg.map((r: any) => r.challenge_id).filter(Boolean))

    const [profilesRes, tournamentsRes, questsRes, challengesRes] = await Promise.all([
      userIds.length
        ? supabase.from('profiles').select('user_id, display_name, gamer_tag').in('user_id', userIds)
        : Promise.resolve({ data: [], error: null } as any),
      tournamentIds.length
        ? supabase.from('tournaments').select('id, name, game').in('id', tournamentIds)
        : Promise.resolve({ data: [], error: null } as any),
      questIds.length
        ? supabase.from('quests').select('id, name').in('id', questIds)
        : Promise.resolve({ data: [], error: null } as any),
      challengeIds.length
        ? supabase.from('challenges').select('id, name').in('id', challengeIds)
        : Promise.resolve({ data: [], error: null } as any),
    ])
    if (profilesRes.error) throw profilesRes.error
    if (tournamentsRes.error) throw tournamentsRes.error
    if (questsRes.error) throw questsRes.error
    if (challengesRes.error) throw challengesRes.error

    const profileMap = new Map<string, any>((profilesRes.data ?? []).map((p: any) => [p.user_id, p]))
    const tournamentMap = new Map<string, any>((tournamentsRes.data ?? []).map((t: any) => [t.id, t]))
    const questMap = new Map<string, any>((questsRes.data ?? []).map((q: any) => [q.id, q]))
    const challengeMap = new Map<string, any>((challengesRes.data ?? []).map((c: any) => [c.id, c]))

    const buildGroups = <R,>(
      rows: R[],
      idKey: keyof R,
      tsKey: keyof R,
      lookup: Map<string, any>,
      subtitleKey?: string,
    ): Group[] => {
      const byItem = new Map<string, R[]>()
      for (const r of rows) {
        const k = String((r as any)[idKey] ?? 'unknown')
        const arr = byItem.get(k) ?? []
        arr.push(r)
        byItem.set(k, arr)
      }
      return [...byItem.entries()]
        .map(([id, rows]) => {
          const item = lookup.get(id)
          return {
            name: item?.name ?? 'Unknown',
            subtitle: subtitleKey ? item?.[subtitleKey] ?? null : null,
            registrants: rows.map((r: any) => ({
              ...profileLabel(profileMap.get(r.user_id)),
              registeredAt: fmtPT(r[tsKey as string]),
            })),
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    const tournamentGroups = buildGroups(tReg, 'tournament_id' as any, 'registered_at' as any, tournamentMap, 'game')
    const questGroups = buildGroups(qReg, 'quest_id' as any, 'enrolled_at' as any, questMap)
    const challengeGroups = buildGroups(cReg, 'challenge_id' as any, 'enrolled_at' as any, challengeMap)

    const totals = {
      tournaments: tReg.length,
      quests: qReg.length,
      challenges: cReg.length,
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
