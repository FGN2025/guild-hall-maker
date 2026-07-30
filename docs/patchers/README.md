# Phase 1 patchers for the creator discovery module

Three patchers that lay the Phase 1 groundwork described in
`docs/creator-discovery-platform-plan.md`. They follow the patcher pattern in
the `fgn-creator-outreach` skill's `operations.md`: pure ASCII, timestamped
backup, `exactly_one()` guard before every edit, `ast.parse()` after,
idempotence check per step, and a failure path that prints the rollback command.

| Patcher | Target | Change | sha256 |
|---|---|---|---|
| `wave8.py` | `outreach/schemas.py` | Registers the `fgn_discovery` BuiltInSchema and `FGN_DISCOVERY_EXPORT_COLUMNS` | `0b11cc43719543a39d539b386f8fe2b08716c52c971dba2d7240d7e6568e9a21` |
| `wave9.py` | `outreach/db.py` | Adds the 11 `disc_*` tables to `SCHEMA` | `2d0f6122e0f0be207ffcdf8166a3da3c4dbd85a3fbed81a6dde712894d98eba4` |
| `wave10.py` | `outreach/ingest_v2.py` | Fixes `primary_platform` mislabeling | `32639b2cf5af960b72c40ba8f511bcd880c15a237aff4a642ba3aaae6f713fd6` |

Apply in order. Each is independent, so `wave10` can be declined without
affecting the other two.

---

## Wave numbering, please confirm

The GitHub repo is a single squashed commit labelled
`initial commit: post-Wave 3 hardened state`, but the skill's build history
records waves through 7 (the brand swap). These are numbered 8, 9 and 10 on
the assumption that 7 was the last one applied. **If the last wave on the VPS
was higher, rename before deploying** so the sequence stays readable. Nothing
inside the scripts depends on the number.

---

## What each one does

### wave8, register the discovery export format

`BuiltInSchema.detect` needs at least 3 of 5 signature columns to fire. The
Sideqik signature is `Sideqik Score`, `Total Reach`, `YouTube Username`,
`Twitch Avg EMV`, `Sideqik Connect Link`. A discovery export carries only
`Total Reach` from that set, so it correctly does not match Sideqik, but
without its own schema it matches nothing and the operator gets the column
wizard on every single import.

This adds `fgn_discovery` with its own signature (`FGN Score`,
`Discovery Search`, `FGN Creator ID`, `Discovery Source`, `Primary Platform`)
and the same 17 internal-field mappings the Sideqik entry uses, plus
`FGN_DISCOVERY_EXPORT_COLUMNS`, the 28-column ordered header list the export
writer emits.

The internal field id stays `sideqik_score` because that is what
`processor._assign_tier` reads. Only the header changes, to `FGN Score`, so
the number is labelled honestly without touching send behavior.

### wave9, the discovery tables

Adds 11 `disc_*` tables to the `SCHEMA` string, applied through the existing
`db.init_schema()` path. Every statement is `CREATE TABLE IF NOT EXISTS`, so
the migration is idempotent at the SQLite level as well as the patcher level.
No existing table is altered and no row is written.

`disc_creators`, `disc_creator_accounts`, `disc_account_metrics`,
`disc_creator_topics`, `disc_creator_games`, `disc_content`, `disc_searches`,
`disc_search_results`, `disc_forms`, `disc_form_submissions`,
`disc_credit_log`.

Conventions match the rest of `db.py`: `INTEGER PRIMARY KEY AUTOINCREMENT`,
JSON in `*_json TEXT`, ISO-8601 UTC strings, `idx_<table>_<column>` index
names, `ON DELETE CASCADE` relying on the per-connection
`PRAGMA foreign_keys = ON`.

### wave10, primary_platform mislabeling

This one is a bug fix, not new scaffolding, and it was found while testing
the round trip rather than by reading the code.

`ingest_v2._primary_platform_from_mapping` picks the primary platform from a
hardcoded precedence list, `YouTube > Twitch > TikTok > ...`, because on the
mapped-upload path there are no per-platform reach columns to compare. Its own
comment says so. The consequence is that **any creator holding both a YouTube
and a Twitch link is recorded as YouTube-primary**, whatever their audience
actually looks like. On a Twitch-leaning gaming cohort that mislabels a large
share of records, and it propagates into `platform_counts`, segmentation, and
the `PRIMARY_PLATFORM` template variable exposed to Resend.

The fix: if the file states a primary platform, believe it. Fall back to
precedence when the column is absent, blank, or unrecognized. A Sideqik upload
has no such column, so its behavior is byte-identical to before.

Verified against the real cohort shape. Before, a Twitch streamer with both
links reports `{'YouTube': 2, 'Twitch': 1}`. After, `{'Twitch': 2, 'YouTube': 1}`.

**Existing rows keep their old value.** Re-import a file to correct it.

---

## Deploy

```bash
# Verify the hash on Windows (type it, do not paste)
certutil -hashfile "C:\Users\DML\Downloads\wave8.py" SHA256

# Upload
scp "C:\Users\DML\Downloads\wave8.py" root@82.180.162.122:/root/wave8.py

# On the VPS
sudo bash -c 'cp /root/wave8*.py /tmp/wave8.py'
sudo chown fgn:fgn /tmp/wave8.py
sha256sum /tmp/wave8.py
python3 /tmp/wave8.py
```

Repeat for `wave9.py` and `wave10.py`, then once at the end:

```bash
sudo systemctl restart fgn-outreach
sudo systemctl status fgn-outreach --no-pager | head -10
sudo journalctl -u fgn-outreach --since "2 min ago" --no-pager | tail -30
```

Rollback, if needed. Each patcher prints its backup directory as its first
line of output:

```bash
sudo cp -r /home/fgn/wave<N>_backup_<ts>/home/* /home/
sudo systemctl restart fgn-outreach
```

### One deployment detail worth knowing

Each patcher runs under the **system** `python3`, but the app's dependencies
(pandas) live in `fgn_creator_outreach/venv`. The verification steps therefore
shell out to `venv/bin/python` rather than importing in-process. If they
imported directly, every verification would fail with
`ModuleNotFoundError: No module named 'pandas'` even on a perfectly healthy
VPS. `wave10` additionally puts `fgn_campaign_pipeline` on the subprocess path,
the same way `app.py` inserts `PIPELINE_ROOT`, because `ingest_v2` imports it.

---

## Test evidence

Built against `fgn_creator_outreach@a863fe1` and
`fgn_campaign_pipeline@4bce0ab`, then exercised in a sandbox reproducing the
VPS layout (`/home/fgn/`, a real venv, the sibling pipeline repo).

- Every `STEP1_OLD` constant verified to appear **exactly once** in the real file
- Both target files confirmed pure ASCII with LF endings before patching
- `py_compile` clean, zero non-ASCII bytes in all three patchers
- All three applied in order from a pristine tree, then re-run: every step
  reports `skip` on the second pass
- **Scenario A**, fresh install with no database: all three pass. This is what
  caught a bug in `wave9`, which counted `creators` rows before
  `init_schema()` and crashed on a database that did not exist yet
- **Scenario B**, database seeded with 1081 rows to match the real cohort size:
  all three pass, all pre-existing tables intact, row count unchanged
- Round trip: a discovery-format CSV written from
  `FGN_DISCOVERY_EXPORT_COLUMNS`, read back off disk, auto-detected as
  `fgn_discovery`, ingested through the real
  `process_upload_with_mapping`, landing 3 rows with correct
  `A_Priority` / `B_Core` / `C_Longtail` tiering, platform links, and
  provenance carried through as `custom_data`
- `wave10` verification covers 7 cases including the no-regression path,
  blank/NaN/unknown fallback, header and value casing, alias canonicalization,
  and a stated platform with no matching link column

What is **not** covered, because it cannot be from here: the live VPS files.
The GitHub repo is at post-Wave-3 while the skill's history mentions later
waves, so if any of those touched `schemas.py`, `db.py` or `ingest_v2.py` near
these anchors, the `exactly_one()` guard will halt the patcher before it
changes anything. That is the guard working as intended, not a failure. Send me
the `sed -n` output around the anchor and I will re-cut the pattern.
