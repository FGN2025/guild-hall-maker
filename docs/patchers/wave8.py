#!/usr/bin/env python3
"""
wave 8: register the FGN Discovery export schema.

Adds a second BuiltInSchema so files produced by the discovery module are
auto-detected on upload instead of falling through to the column wizard.

Background: BuiltInSchema.detect requires at least 3 of 5 signature columns.
The Sideqik signature is Sideqik Score, Total Reach, YouTube Username,
Twitch Avg EMV, Sideqik Connect Link. A discovery export carries only
Total Reach from that set, so it scores 1 hit and correctly does NOT
match Sideqik. Without its own registered schema it matches nothing and
the operator gets the wizard on every single import.

What it modifies:
  - outreach/schemas.py: appends the fgn_discovery entry to BUILT_IN_SCHEMAS
  - outreach/schemas.py: adds FGN_DISCOVERY_EXPORT_COLUMNS, the ordered
    header list the discovery export writer emits

No database changes. No behavior change for existing Sideqik uploads:
the new schema's signature columns do not appear in a Sideqik export, and
the Sideqik entry stays first in the registry.

Idempotent. Pure ASCII. Backup: /home/fgn/wave8_backup_<ts>/
"""
from __future__ import annotations
import ast, shutil, subprocess, sys, time
from pathlib import Path

HOME = Path("/home/fgn")
APP = HOME / "fgn_creator_outreach"
TARGET = APP / "outreach" / "schemas.py"
BACKUP_DIR = HOME / f"wave8_backup_{int(time.time())}"


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
    """
    The interpreter that actually has the app's dependencies.

    The service runs from a venv (install.sh creates
    fgn_creator_outreach/venv and systemd ExecStart points at
    venv/bin/streamlit), and pandas is installed only there. This patcher
    is run as `python3 /tmp/wave8.py` with the system interpreter, which
    cannot import outreach.schemas because that module imports pandas.
    So verification has to shell out to the venv interpreter, not import
    in-process.
    """
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


# --- step 1: register the schema and the export column order

STEP1_OLD = '''            "facebook_link":  "Facebook Link",
        },
    ),
]
'''

STEP1_NEW = '''            "facebook_link":  "Facebook Link",
        },
    ),
    BuiltInSchema(
        schema_id="fgn_discovery",
        name="FGN Discovery Export",
        description=(
            "Export produced by the in-house discovery module. Same internal "
            "fields as the Sideqik export, but scored by FGN and carrying "
            "provenance columns so a batch can be traced back to the saved "
            "search that produced it."
        ),
        signature_columns=[
            "FGN Score", "Discovery Search", "FGN Creator ID",
            "Discovery Source", "Primary Platform",
        ],
        min_matches=3,
        fixed_mapping={
            "email":          "Email",
            "first_name":     "First Name",
            "last_name":      "Last Name",
            "name":           "Name",
            "screen_name":    "Screen Name",
            "city":           "City",
            "state":          "State",
            "country":        "Country",
            # Internal field id stays sideqik_score because that is what
            # processor._assign_tier reads. The header is honest about
            # where the number actually came from.
            "sideqik_score":  "FGN Score",
            "total_reach":    "Total Reach",
            "labels":         "Labels",
            "youtube_link":   "YouTube Link",
            "twitch_link":    "Twitch Link",
            "tiktok_link":    "TikTok Link",
            "instagram_link": "Instagram Link",
            "x_link":         "X Link",
            "facebook_link":  "Facebook Link",
        },
    ),
]


# ----------------------------------------------------------------------------
# Discovery export column order
# ----------------------------------------------------------------------------
# The discovery export writer emits exactly these headers, in this order.
# The first block is everything fgn_discovery.fixed_mapping consumes on
# re-import. The second block is provenance and diagnostics: ignored by the
# ingest, useful to a human reviewing a batch, and the reason the schema
# signature can identify the format at all.
#
# Keep in sync with fixed_mapping above. A header renamed here without the
# matching change there silently drops that column on re-import.

FGN_DISCOVERY_EXPORT_COLUMNS: list[str] = [
    # mapped into the Creator model
    "Email",
    "First Name",
    "Last Name",
    "Name",
    "Screen Name",
    "City",
    "State",
    "Country",
    "FGN Score",
    "Total Reach",
    "Labels",
    "YouTube Link",
    "Twitch Link",
    "TikTok Link",
    "Instagram Link",
    "X Link",
    "Facebook Link",
    # provenance and diagnostics, not mapped
    "FGN Creator ID",
    "Discovery Search",
    "Discovery Source",
    "Primary Platform",
    "Brand Safety Score",
    "Location Confidence",
    "Email Source",
    "Email Confidence",
    "Matched Topics",
    "Matched Games",
    "Last Refreshed",
]
'''


def step1():
    step(1, "Register fgn_discovery in BUILT_IN_SCHEMAS + export column order")
    src = TARGET.read_text()
    if "fgn_discovery" in src:
        print("[step 1] SKIP: fgn_discovery schema already registered")
        return "skip"
    exactly_one(src, STEP1_OLD, "tail of the sideqik BuiltInSchema entry")
    backup(TARGET)
    src = src.replace(STEP1_OLD, STEP1_NEW, 1)
    TARGET.write_text(src)
    syntax_check(TARGET)
    print("[step 1] applied")
    return "ok"


# --- step 2: verify the registry through the app's own interpreter

VERIFY_SRC = r"""
import sys
from outreach import schemas as sc

def fail(msg):
    print("VERIFY_FAIL: " + msg)
    sys.exit(1)

ids = [s.schema_id for s in sc.BUILT_IN_SCHEMAS]
print("registered schemas: %s" % ids)
if ids != ["sideqik", "fgn_discovery"]:
    fail("unexpected registry order or contents: %s" % ids)

# A discovery export must detect as fgn_discovery, not sideqik.
hit = sc.detect_built_in(list(sc.FGN_DISCOVERY_EXPORT_COLUMNS))
got = hit.schema_id if hit else None
if got != "fgn_discovery":
    fail("discovery headers detected as %s, expected fgn_discovery" % got)
print("discovery headers -> fgn_discovery  OK")

# A Sideqik export must still detect as sideqik. No regression.
sideqik_headers = [
    "Email", "First Name", "Last Name", "Name", "Screen Name",
    "City", "Province/State", "Country", "Sideqik Score", "Total Reach",
    "Labels", "YouTube Link", "Twitch Link", "TikTok Link",
    "Instagram Link", "X Link", "Facebook Link",
    "YouTube Username", "Twitch Avg EMV", "Sideqik Connect Link",
]
hit = sc.detect_built_in(sideqik_headers)
got = hit.schema_id if hit else None
if got != "sideqik":
    fail("sideqik headers detected as %s, expected sideqik" % got)
print("sideqik headers -> sideqik  OK (no regression)")

# Every fixed_mapping target must be a real internal field id.
for s in sc.BUILT_IN_SCHEMAS:
    for fid in s.fixed_mapping:
        if fid not in sc.INTERNAL_FIELD_IDS:
            fail("%s: unknown internal field %r" % (s.schema_id, fid))
print("all fixed_mapping field ids valid  OK")

# Required fields must be mapped or the ingest rejects every row.
for s in sc.BUILT_IN_SCHEMAS:
    missing = [f for f in sc.REQUIRED_FIELDS if f not in s.fixed_mapping]
    if missing:
        fail("%s: required field(s) unmapped: %s" % (s.schema_id, missing))
print("required fields mapped in both schemas  OK")

# Mapped headers must actually appear in the export column list.
disc = [s for s in sc.BUILT_IN_SCHEMAS if s.schema_id == "fgn_discovery"][0]
cols = set(sc.FGN_DISCOVERY_EXPORT_COLUMNS)
absent = sorted(h for h in disc.fixed_mapping.values() if h not in cols)
if absent:
    fail("fixed_mapping headers missing from export columns: %s" % absent)
print("fixed_mapping headers all present in export columns  OK")

# No duplicate headers in the export order.
seen = set()
dupes = sorted({h for h in sc.FGN_DISCOVERY_EXPORT_COLUMNS
                if h in seen or seen.add(h)})
if dupes:
    fail("duplicate export columns: %s" % dupes)
print("export column list has no duplicates  OK")

print("VERIFY_OK")
"""


def step2():
    step(2, "Verify both schemas load and neither false-matches the other")
    py = app_python()
    print(f"[step 2] interpreter: {py}")
    rc, out, err = run([py, "-c", VERIFY_SRC], timeout=120, cwd=str(APP))
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
    print("Next: sudo systemctl restart fgn-outreach")
    return 0


if __name__ == "__main__":
    sys.exit(main())
