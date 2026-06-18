// Scheduled trigger: invoked daily by pg_cron at 8 AM Eastern.
// Calls send-transactional-email with the discord-backlog-reminder template.
// The template has `to: 'darcy@fgn.gg'` baked in, so no recipient is needed here.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server configuration error' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD — daily dedupe key

  const { data, error } = await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'discord-backlog-reminder',
      idempotencyKey: `discord-backlog-${today}`,
      templateData: {},
    },
  })

  if (error) {
    console.error('Failed to send discord backlog reminder', error)
    return json({ ok: false, error: error.message }, 500)
  }

  return json({ ok: true, date: today, result: data })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
