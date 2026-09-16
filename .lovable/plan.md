# Fire a test challenge event at Merits

## Current state (checked just now)

- Three active subscriptions exist on the Play side pointing at
  `https://merits.fgn.academy/webhooks/fgn-challenges` for `challenge.created`,
  `challenge.updated`, and `challenge.deactivated`.
- That address still answers **404** to both GET and POST, so nothing can land there yet.
- The Sync Log shows successful catalogue pulls by Merits (119 challenges, 59 games) but
  no delivered challenge events.

So a test fired today will leave a failed-delivery record, not a success. That is still
useful: it proves our side signs and sends correctly and gives Merits a request to look for.

## What I'll do

1. Fire one real challenge event by touching a single harness challenge (flip a
   non-visible field so `challenge.updated` fires, then restore it). No player-facing
   challenge content changes.
2. Capture the delivery: event type, delivery id, signature fingerprint, the exact URL
   called, and the HTTP status Merits returns.
3. Record the outcome in the Sync Log view so it's visible in the admin Ecosystem page.
4. Report back the result. Expected today: HTTP 404 from Merits.

## If it returns 404 (expected)

The gap is on the Merits side: the receiver must be a backend endpoint, not a page route
in its web app. Once Merits gives us its live endpoint (typically its own
`.../functions/v1/fgn-challenge-webhook`), I repoint the three subscriptions to it and
re-fire — no other change needed here.

## Notes

- Signing uses the secret already saved on this side; nothing about it is printed.
- No changes to the challenge catalogue, no changes to subscriptions unless you give me
  the new receiver address.
