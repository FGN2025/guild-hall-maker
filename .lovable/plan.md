# Academy Handoff Message — Phase E Shadow Active

## Goal
Produce a single self-contained message you can paste into the Academy team's chat (or the FiberTech Academy Lovable project chat) so their AI/dev team can stand up the HMAC receiver and start the parity window.

## Optional pre-send sanity check (read-only)
Before drafting, I can peek at the FiberTech Academy project to confirm:
- Whether `play-webhook-receiver` (or equivalent) edge function already exists at the URL we have registered (`https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/play-webhook-receiver`)
- Whether they already verify `X-Play-Signature` against `PLAY_WEBHOOK_SECRET`
- Whether any of the new P-3 metadata fields (`external_attempt_id`, `tenant_id`, `tenant_slug`, `tenant_name`) are already consumed

If any gaps surface, I'll call them out explicitly in the message ("you still need to do X") instead of assuming parity.

## Message structure
Single Markdown block, ~250 lines, copy-paste ready. Sections:

1. **TL;DR** — one paragraph: shadow is live now, your authoritative path is unchanged, here's what to do.
2. **What changed** — the dual-send table (direct POST + HMAC webhook).
3. **HMAC contract** — header name, algorithm, signed bytes, secret name, plus a Node verifier snippet.
4. **Payload reference** — the full JSON shape with the new P-3 metadata fields highlighted.
5. **What we need from you** — numbered checklist:
   - Stand up receiver in shadow/lenient mode (log every verify result)
   - Confirm receipt counts after ~24h
   - Flip to strict after 48h of clean matches
   - Persist the new metadata fields
6. **Rollback** — kill switch (flip `PHASE_E_ROUTING_MODE` back to `off`).
7. **Reference docs** — file paths in our repo they can request verbatim.

## Delivery format
I'll output the message inside a fenced ```` ```markdown ```` block in chat so you can copy it cleanly. No file changes.

## Out of scope
- Posting to their workspace directly (not possible — see capability note above)
- Changing payload shape further (P-3 already shipped)
- Flipping to `live` mode (gated on their 48h clean-match confirmation)

## Question before I draft
Do you want me to **run the pre-send sanity check** against the FiberTech Academy project first (adds 1-2 read-only tool calls but lets the message say exactly what they still owe), or **draft the generic message immediately** assuming nothing about their current state?
