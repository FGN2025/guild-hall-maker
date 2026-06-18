
# Wire FGN Play bot → new channel in Fiber Gaming Network

No code changes — this is configuration in Discord + the existing Admin → Ecosystem → Discord panel.

## Step 1 — Create the channel in Discord

1. In the **Fiber Gaming Network** server, hover the category where it belongs (e.g. "INFORMATION" or create a new "BOT FEED" category) and click the **+** next to the category name.
2. Channel type: **Text**.
3. Name: `fgn-play-feed` (suggested — clear, scoped to bot posts).
4. Leave as **Public** (anyone in the server can read). Click **Create Channel**.

Tip: if you want only staff to read it, toggle **Private Channel** and add the staff roles before creating.

## Step 2 — Give the FGN Play bot access

1. Right-click **#fgn-play-feed** → **Edit Channel** → **Permissions**.
2. Under **ROLES/MEMBERS** click the **➕** → search **FGN Play** → select it.
3. Set these to green ✅: **View Channel**, **Send Messages**, **Embed Links**. Leave the rest neutral.
4. Save.

(If the channel is Private, also add @everyone → ❌ View Channel, plus any staff roles that need to see it.)

## Step 3 — Copy the channel ID

1. Discord → User Settings → **Advanced** → enable **Developer Mode** (if not already).
2. Right-click **#fgn-play-feed** → **Copy Channel ID**.

## Step 4 — Add the route in the admin panel

In **Admin → Ecosystem → Discord → Bot Channel Routes**:

1. **Purpose:** `tournament_published` (we'll add more after testing).
2. **Channel ID:** paste the ID from Step 3.
3. **Guild ID:** leave blank (optional).
4. **Tenant ID:** **leave blank** — this scopes the route to **all global FGN events**.
5. **Notes:** "FGN Play global feed" (optional).
6. Click **Add**.

## Step 5 — Test

Click the **📨 Send** icon on the new route row. Expected:
- Toast says "Test sent · Dispatched: 1".
- An embed appears in **#fgn-play-feed**.
- If you see a 403, recheck Step 2 (View Channel + Send Messages + Embed Links for FGN Play).
- If you see "Dispatched: 0", the route didn't save with `is_active = true` or the bot token isn't loaded — toggle the row off/on and retry.

## Step 6 — Add the other event types (after the test passes)

Repeat Step 4 with the same channel ID, leaving Tenant ID blank, for each purpose you want in this feed:

- `tournament_completed`
- `tenant_event_published`
- `challenge_published`
- `quest_published`
- `prize_redeemed`
- `achievement_earned`

Each is a separate route row sharing the same channel ID.

---

**Deliverable:** a single `#fgn-play-feed` channel in the Fiber Gaming Network server receiving live embeds from the FGN Play bot for every globally-published event. No code or DB changes required.
