# Re-fire the three challenge events at Merits

## What changed since last time

The Merits receiving address is now live. An unsigned test POST to
`https://merits.fgn.academy/webhooks/fgn-challenges` came back **401 (signature rejected)**
instead of the previous **404 (nothing there)**. That means the endpoint is deployed and
checking signatures — exactly what we want before firing real events.

## What I'll do

1. Confirm the three subscriptions (`challenge.created`, `challenge.updated`,
   `challenge.deactivated`) are still active and pointed at that address.
2. Fire one event of each of the three types:
   - `challenge.updated` — touch only the timestamp on the same hidden, inactive harness
     challenge used last time. No visible content, points, or availability changes.
   - `challenge.created` and `challenge.deactivated` — fire directly through the delivery
     service using the same harness challenge, so no real challenge is created or turned off.
3. Record each result in the Sync Log: event type, delivery id, and the status Merits returns.
4. Report back which of the three landed.

## Expected outcomes

- **All three return 2xx** — the connection is fully working; nothing further needed.
- **Any return 401** — the signing key saved on the Merits side doesn't match ours. I'll
  report the safe fingerprint of our key so Merits can compare, and re-fire once it matches.
- **Any return 4xx/5xx other than 401** — a fault inside the Merits receiver; I'll pass along
  the exact status and body it returned.

## Notes

- No secret value is printed at any point, only a short non-reversible fingerprint.
- No changes to the challenge catalogue, subscriptions, or player-facing content.
