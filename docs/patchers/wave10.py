#!/usr/bin/env python3
"""
wave 10: honor an explicit Primary Platform column during ingest.

The defect this fixes
---------------------
outreach/ingest_v2.py::_primary_platform_from_mapping picks primary_platform
from a hardcoded precedence list:

    priority = ["YouTube", "Twitch", "TikTok", "Instagram", "X", "Facebook"]

Its own comment explains why: "Without reach data we can't pick by reach".
That is true for the mapped-upload path, because the mapping carries only
link columns, not the per-platform "<Platform> Reach" columns that
fgn_pipeline.processor._primary_platform reads on the legacy Sideqik path.

The consequence is that ANY creator with both a YouTube and a Twitch link
is recorded as YouTube-primary, whatever their actual audience looks like.
For FGN's gaming cohort, which skews Twitch, that mislabels a large share
of records. It then propagates: platform_counts in the ingest report,
segmentation, and the PRIMARY_PLATFORM template variable exposed to Resend
are all derived from this value.

The fix
-------
If the uploaded file carries a "Primary Platform" column, believe it.
Fall back to the existing precedence list when it is absent, empty, or
holds an unrecognized value.

Blast radius is limited by design. The new branch only fires for files that
actually contain that column, which today means discovery exports only. A
Sideqik upload has no such column, so its behavior is byte-identical to
before. Existing rows already in the database are not touched; re-import a
file to pick up corrected values.

What it modifies:
  - outreach/ingest_v2.py: _primary_platform_from_mapping gains an
    explicit-column branch and a canonicalizing helper

Idempotent. Pure ASCII. Backup: /home/fgn/wave10_backup_<ts>/
"""
from __future__ import annotations
import ast, shutil, subprocess, sys, time
from pathlib import Path

HOME = Path("/home/fgn")
APP = HOME / "fgn_creator_outreach"
# ingest_v2 imports fgn_pipeline, which app.py puts on sys.path as
# PIPELINE_ROOT = <app>/../fgn_campaign_pipeline. The verification
# subprocess has to do the same or the import fails.
PIPELINE = HOME / "fgn_campaign_pipeline"
TARGET = APP / "outreach" / "ingest_v2.py"
BACKUP_DIR = HOME / f"wave10_backup_{int(time.time())}"


def run(cmd, timeout=None, cwd=None):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True,
                           timeout=timeout, cwd=cwd)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return 124, "", "timeout"
    except FileNotFoundError as e:
        return 127, "", str(e)


def app_python():
    """The interpreter with the app's deps. See wave8 for the reasoning."""
    venv = APP / "venv" / "bin" / "python"
    if venv.exists():
        return str(venv)
    print("[warn] venv interpreter not found, falling back to "
          f"{sys.executable} (verification may fail on missing deps)")
    return sys.executable


def backup(path):
    if not path.exists():
        return
    rel = path.relative_to("/") if path.is_absolute() else path
    dst = BACKUP_DIR / str(rel)
    dst.parent.mkdir(parents=True, exist_ok=True)
    rc, _, _ = run(["sudo", "cp", "-p", str(path), str(dst)])
    if rc != 0:
        shutil.copy2(path, dst)
    run(["sudo", "chown", "-R", "fgn:fgn", str(BACKUP_DIR)])


def syntax_check(path):
    try:
        ast.parse(path.read_text())
    except SyntaxError as e:
        raise RuntimeError(f"syntax error in {path}: {e}")


def exactly_one(haystack, needle, label):
    c = haystack.count(needle)
    if c == 0:
        raise RuntimeError(f"{label}: old string not found")
    if c > 1:
        raise RuntimeError(f"{label}: found {c} times, expected 1")


def step(n, title):
    print()
    print("=" * 70)
    print(f"  STEP {n}: {title}")
    print("=" * 70)


# --- step 1: believe an explicit Primary Platform column when present

STEP1_OLD = '''    # Without reach data we can't pick by reach, so prefer YouTube > Twitch > ...
    priority = ["YouTube", "Twitch", "TikTok", "Instagram", "X", "Facebook"]
    primary = next((p for p in priority if p in links), "")
    return primary, links
'''

STEP1_NEW = '''    # If the file states a primary platform outright, believe it. Discovery
    # exports do, because the discovery module tracks real per-platform
    # follower counts and already knows which account is the creator's main
    # one. Precedence guessing below would override that with YouTube for
    # anyone holding both a YouTube and a Twitch link, which mislabels a
    # large share of a Twitch-leaning gaming cohort.
    explicit = _explicit_primary_platform(row, links)
    if explicit:
        return explicit, links

    # Without reach data we can't pick by reach, so prefer YouTube > Twitch > ...
    priority = ["YouTube", "Twitch", "TikTok", "Instagram", "X", "Facebook"]
    primary = next((p for p in priority if p in links), "")
    return primary, links


# Canonical platform spelling, keyed by lowercased input. Values match
# PLATFORM_COLS in fgn_pipeline.processor so downstream consumers
# (platform_counts, PRIMARY_PLATFORM template var) stay consistent.
_CANONICAL_PLATFORMS = {
    "youtube": "YouTube",
    "yt": "YouTube",
    "twitch": "Twitch",
    "tiktok": "TikTok",
    "tik tok": "TikTok",
    "instagram": "Instagram",
    "ig": "Instagram",
    "x": "X",
    "twitter": "X",
    "facebook": "Facebook",
    "fb": "Facebook",
    "kick": "Kick",
}


def _explicit_primary_platform(
    row: pd.Series,
    links: dict[str, str],
) -> str:
    """
    Read a stated primary platform off the row, or return "".

    Looks for a "Primary Platform" column (case and whitespace tolerant).
    Returns "" when the column is absent, blank, or holds something we
    cannot map to a canonical platform name, so the caller falls back to
    precedence. A stated platform is accepted even when no matching link
    column was populated, because a creator can be primarily on a platform
    whose profile URL we do not happen to have.
    """
    for col in row.index:
        if not isinstance(col, str):
            continue
        if col.strip().lower().replace("_", " ") != "primary platform":
            continue
        raw = row[col]
        if pd.isna(raw):
            return ""
        canon = _CANONICAL_PLATFORMS.get(str(raw).strip().lower(), "")
        return canon
    return ""
'''


def step1():
    step(1, "Honor an explicit Primary Platform column in _primary_platform_from_mapping")
    src = TARGET.read_text()
    if "_explicit_primary_platform" in src:
        print("[step 1] SKIP: explicit primary-platform branch already present")
        return "skip"
    exactly_one(src, STEP1_OLD, "precedence tail of _primary_platform_from_mapping")
    backup(TARGET)
    src = src.replace(STEP1_OLD, STEP1_NEW, 1)
    TARGET.write_text(src)
    syntax_check(TARGET)
    print("[step 1] applied")
    return "ok"


# --- step 2: verify the new branch and prove no regression

VERIFY_SRC = r"""
import sys
sys.path.insert(0, "__PIPELINE__")
import pandas as pd
from outreach import ingest_v2 as iv

def fail(msg):
    print("VERIFY_FAIL: " + msg)
    sys.exit(1)

MAPPING = {
    "youtube_link": "YouTube Link",
    "twitch_link": "Twitch Link",
    "tiktok_link": "TikTok Link",
}

def call(cells):
    return iv._primary_platform_from_mapping(pd.Series(cells), MAPPING)

# 1. The defect case: both links present, Twitch stated. Twitch must win.
primary, links = call({
    "YouTube Link": "https://youtube.com/@chef7x",
    "Twitch Link": "https://twitch.tv/chef7x",
    "Primary Platform": "twitch",
})
if primary != "Twitch":
    fail("stated Twitch was overridden, got %r" % primary)
if set(links) != {"YouTube", "Twitch"}:
    fail("links dict wrong: %r" % links)
print("stated Twitch beats YouTube precedence  OK")

# 2. No Primary Platform column: precedence must apply exactly as before.
primary, _ = call({
    "YouTube Link": "https://youtube.com/@chef7x",
    "Twitch Link": "https://twitch.tv/chef7x",
})
if primary != "YouTube":
    fail("precedence fallback broken, got %r" % primary)
print("no column -> YouTube precedence unchanged  OK (no regression)")

# 3. Blank / NaN / unrecognized values fall back to precedence.
for bad in ["", "   ", "mastodon", None]:
    cells = {
        "YouTube Link": "https://youtube.com/@x",
        "Twitch Link": "https://twitch.tv/x",
        "Primary Platform": bad,
    }
    primary, _ = call(cells)
    if primary != "YouTube":
        fail("value %r should fall back to precedence, got %r" % (bad, primary))
print("blank/NaN/unknown values fall back to precedence  OK")

# 4. Case and separator tolerance on both header and value.
for header in ["Primary Platform", "primary platform", "PRIMARY_PLATFORM"]:
    primary, _ = call({
        "YouTube Link": "https://youtube.com/@x",
        header: "TWITCH",
    })
    if primary != "Twitch":
        fail("header %r not recognized, got %r" % (header, primary))
print("header and value casing tolerated  OK")

# 5. Aliases map to canonical spelling used by PLATFORM_COLS.
for value, want in [("twitter", "X"), ("ig", "Instagram"), ("kick", "Kick"),
                    ("Tik Tok", "TikTok")]:
    primary, _ = call({"YouTube Link": "https://youtube.com/@x",
                       "Primary Platform": value})
    if primary != want:
        fail("alias %r -> %r, expected %r" % (value, primary, want))
print("platform aliases canonicalized  OK")

# 6. A stated platform with no link column still wins. A creator can be
#    primarily on Kick without us holding a Kick URL.
primary, links = call({"YouTube Link": "https://youtube.com/@x",
                       "Primary Platform": "kick"})
if primary != "Kick":
    fail("stated platform without a link should still win, got %r" % primary)
if "Kick" in links:
    fail("links must only contain platforms with real URLs: %r" % links)
print("stated platform without a link still wins  OK")

# 7. Empty row: no crash, empty primary.
primary, links = call({})
if primary != "" or links != {}:
    fail("empty row should give ('', {}), got (%r, %r)" % (primary, links))
print("empty row handled  OK")

print("VERIFY_OK")
"""


def step2():
    step(2, "Verify the explicit branch and the precedence fallback")
    py = app_python()
    print(f"[step 2] interpreter: {py}")
    src = VERIFY_SRC.replace("__PIPELINE__", str(PIPELINE))
    rc, out, err = run([py, "-c", src], timeout=180, cwd=str(APP))
    for line in (out or "").splitlines():
        print(f"[step 2] {line}")
    if rc != 0 or "VERIFY_OK" not in (out or ""):
        raise RuntimeError(
            f"verification failed (rc={rc}): {(err or out or '').strip()[-500:]}"
        )
    print("[step 2] all checks passed")
    return "ok"


# --- main

def main():
    print(f"[init] backup dir: {BACKUP_DIR}")
    print(f"[init] target:     {TARGET}")
    if not TARGET.exists():
        print(f"FAILURE: target does not exist: {TARGET}")
        return 1
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    run(["sudo", "chown", "fgn:fgn", str(BACKUP_DIR)])
    results = {}
    try:
        results["step1"] = step1()
        results["step2"] = step2()
    except Exception as e:
        print()
        print("=" * 70)
        print(f"  FAILURE: {e}")
        print("=" * 70)
        print(f"Backup dir: {BACKUP_DIR}")
        print(f"Manual rollback:  sudo cp -r {BACKUP_DIR}/home/* /home/")
        return 1
    print()
    print("=" * 70)
    print("  COMPLETE")
    print("=" * 70)
    for k, v in results.items():
        print(f"  {k}: {v}")
    print()
    print("Note: this changes ingest only. Rows already in the database keep")
    print("their old primary_platform. Re-import a file to correct them.")
    print()
    print("Next: sudo systemctl restart fgn-outreach")
    return 0


if __name__ == "__main__":
    sys.exit(main())
