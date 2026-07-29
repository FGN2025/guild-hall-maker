## What's wrong

Every read of `tournament_registrations` from the app is failing with a database error, so the UI falls back to a count of zero. Confirmed from the live network log — each of these returns HTTP 500:

```text
GET /tournament_registrations?select=tournament_id&in.(...)
{"code":"42P17","message":"infinite recursion detected in policy for relation \"tournament_registrations\""}
```

The data is fine. A direct database count shows real registrations, e.g. Overwatch Game Night 3, Valorant Game Night 2, Roblox Tournament 2, Mario Kart World 2, plus several with 1. All of these render as 0/16.

**Root cause (verified against the live policy list):** the SELECT policy `Co-participants can view registrations` queries the very table it protects:

```sql
EXISTS (SELECT 1 FROM tournament_registrations tr2
        WHERE tr2.tournament_id = tournament_registrations.tournament_id
          AND tr2.user_id = auth.uid())
```

Postgres re-applies the policy while evaluating the subquery, which recurses and aborts the whole query — including for admins, because one broken policy in the OR chain kills the statement.

This also explains the other symptoms in the same session: the Manage page failing to load registered players, and the tier/attendance panel coming up empty.

## The fix

**1. Migration — break the recursion**

- Add a `SECURITY DEFINER` helper, `public.is_tournament_participant(_tournament_id uuid, _user_id uuid) returns boolean`, `STABLE`, `SET search_path = public`, which does the same existence check. Because it is `SECURITY DEFINER` it bypasses RLS on the inner read, so there is no recursion.
- Drop `Co-participants can view registrations` and recreate it as `USING (public.is_tournament_participant(tournament_id, auth.uid()))`, scoped `TO authenticated`.
- Leave the other four policies (own row, admin/moderator, creator, insert/delete) untouched.
- Grant `EXECUTE` on the helper to `authenticated` only.

**2. Verify**

- Re-run the exact failing query as an authenticated non-admin and confirm 200 with rows instead of 42P17.
- Confirm counts on `/tournaments` match the direct database counts above.
- Confirm a non-participant, non-admin still cannot read another tournament's registration rows — the policy boundary must stay intact.

## Note on signed-out visitors

There is no `anon` SELECT policy on this table, so logged-out visitors will still see 0/16 even after the recursion fix. Existing project rules restrict registration counts to platform admins, so I am **not** changing that here. If you want public "3/16 registered" on the tournament cards for guests, that is a separate small change: a `SECURITY DEFINER` counting function that returns only the number, never the participant identities.
