#!/usr/bin/env python3
"""
wave 9: add the discovery tables to the database schema.

Creates the disc_* tables that back the creator discovery module. All DDL
goes into the existing SCHEMA string, so it is applied by the existing
db.init_schema() -> executescript() path. Every statement is
CREATE TABLE IF NOT EXISTS, which makes the migration idempotent at the
SQLite level as well as the patcher level.

What it modifies:
  - outreach/db.py: appends the disc_* DDL to the SCHEMA string

Tables:
  disc_creators          one row per person
  disc_creator_accounts  one row per social account, drives the platform icons
  disc_account_metrics   follower/view snapshots over time, drives growth
  disc_creator_topics    "who talk about" evidence
  disc_creator_games     "who play" evidence, per game title
  disc_content           recent posts, drives the content thumbnail panel
  disc_searches          saved smart searches
  disc_search_results    the Results/Shortlisted/Recruiting/Added/Archived funnel
  disc_forms             recruitment form definitions
  disc_form_submissions  applications, and where first-party emails arrive
  disc_credit_log        vidIQ spend audit, non-negotiable given the quota

Conventions match the rest of db.py: INTEGER PRIMARY KEY AUTOINCREMENT,
structured values in *_json TEXT columns, ISO-8601 UTC strings for times,
idx_<table>_<column> index names, and ON DELETE CASCADE relying on the
PRAGMA foreign_keys = ON that db.conn() sets per connection.

No existing table is altered and no row is written, so this cannot affect
current campaign or send behavior.

Idempotent. Pure ASCII. Backup: /home/fgn/wave9_backup_<ts>/
"""
from __future__ import annotations
import ast, shutil, subprocess, sys, time
from pathlib import Path

HOME = Path("/home/fgn")
APP = HOME / "fgn_creator_outreach"
TARGET = APP / "outreach" / "db.py"
BACKUP_DIR = HOME / f"wave9_backup_{int(time.time())}"


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
    venv/bin/streamlit). This patcher runs under the system interpreter,
    so the migration has to be applied by the venv interpreter instead,
    against the same DB the app reads.
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


# --- step 1: append the disc_* DDL to SCHEMA

STEP1_OLD = '''    UNIQUE(display_name, email)
);
"""
'''

STEP1_NEW = '''    UNIQUE(display_name, email)
);

-- ------------------------------------------------------------------
-- Creator discovery (disc_*)
-- ------------------------------------------------------------------
-- Backs the in-house replacement for Sideqik Smart Search. Kept in its
-- own prefix so it stays visually separate from the campaign schema.
-- Joins to the existing creators table by recomputing processor's
-- creator_id, which is sha256("email|name")[:16], so a discovery record
-- only lines up once both email and display name are known.

CREATE TABLE IF NOT EXISTS disc_creators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id TEXT,                  -- sha256("email|name")[:16], null until email known
    display_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    screen_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    primary_platform TEXT,
    country TEXT,
    state TEXT,
    city TEXT,
    location_confidence REAL,         -- 0-1. country is reliable, state/city are parsed
    niche TEXT,
    niche_confidence REAL,
    fgn_score REAL,                   -- 0-100, same scale as processor._assign_tier reads
    fgn_score_components_json TEXT,   -- per-component breakdown so the score is explainable
    brandsafe_score REAL,
    brandsafe_reasons_json TEXT,
    tier TEXT,                        -- A_Priority | B_Core | C_Longtail
    total_reach REAL,
    email TEXT,
    email_source TEXT,                -- description | about_page | form | manual
    email_confidence REAL,
    labels_json TEXT,
    notes TEXT,
    first_seen TEXT NOT NULL,
    last_refreshed TEXT
);

CREATE INDEX IF NOT EXISTS idx_disc_creators_creator_id ON disc_creators(creator_id);
CREATE INDEX IF NOT EXISTS idx_disc_creators_email ON disc_creators(email);
CREATE INDEX IF NOT EXISTS idx_disc_creators_country ON disc_creators(country);
CREATE INDEX IF NOT EXISTS idx_disc_creators_state ON disc_creators(state);
CREATE INDEX IF NOT EXISTS idx_disc_creators_tier ON disc_creators(tier);
CREATE INDEX IF NOT EXISTS idx_disc_creators_score ON disc_creators(fgn_score);

CREATE TABLE IF NOT EXISTS disc_creator_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disc_creator_id INTEGER NOT NULL,
    platform TEXT NOT NULL,           -- youtube | twitch | tiktok | instagram | x | facebook | kick
    handle TEXT,
    external_id TEXT,                 -- platform-native id, e.g. YouTube channelId
    url TEXT,
    followers REAL,
    verified INTEGER NOT NULL DEFAULT 0,
    last_refreshed TEXT,
    UNIQUE(platform, external_id),
    FOREIGN KEY (disc_creator_id) REFERENCES disc_creators(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_disc_accounts_creator ON disc_creator_accounts(disc_creator_id);
CREATE INDEX IF NOT EXISTS idx_disc_accounts_platform ON disc_creator_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_disc_accounts_handle ON disc_creator_accounts(handle);

CREATE TABLE IF NOT EXISTS disc_account_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    followers REAL,
    views REAL,
    videos INTEGER,
    avg_views REAL,
    growth_7d REAL,
    growth_30d REAL,
    growth_1y REAL,
    est_earnings REAL,
    captured_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES disc_creator_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_disc_metrics_account ON disc_account_metrics(account_id);
CREATE INDEX IF NOT EXISTS idx_disc_metrics_captured ON disc_account_metrics(captured_at);

CREATE TABLE IF NOT EXISTS disc_creator_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disc_creator_id INTEGER NOT NULL,
    topic TEXT NOT NULL,
    source TEXT,                      -- niche | subniche | description | transcript | title
    confidence REAL,
    post_count_90d INTEGER NOT NULL DEFAULT 0,
    last_seen TEXT,
    UNIQUE(disc_creator_id, topic),
    FOREIGN KEY (disc_creator_id) REFERENCES disc_creators(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_disc_topics_creator ON disc_creator_topics(disc_creator_id);
CREATE INDEX IF NOT EXISTS idx_disc_topics_topic ON disc_creator_topics(topic);

CREATE TABLE IF NOT EXISTS disc_creator_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disc_creator_id INTEGER NOT NULL,
    game_title TEXT NOT NULL,
    evidence_count INTEGER NOT NULL DEFAULT 0,
    evidence_source TEXT,             -- title | transcript | subniche | twitch_stream
    last_seen TEXT,
    UNIQUE(disc_creator_id, game_title),
    FOREIGN KEY (disc_creator_id) REFERENCES disc_creators(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_disc_games_creator ON disc_creator_games(disc_creator_id);
CREATE INDEX IF NOT EXISTS idx_disc_games_title ON disc_creator_games(game_title);

CREATE TABLE IF NOT EXISTS disc_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disc_creator_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    content_id TEXT NOT NULL,
    url TEXT,
    title TEXT,
    thumbnail_url TEXT,
    published_at TEXT,
    views REAL,
    likes REAL,
    comments REAL,
    duration_seconds REAL,
    is_outlier INTEGER NOT NULL DEFAULT 0,
    outlier_score REAL,
    fetched_at TEXT NOT NULL,
    UNIQUE(platform, content_id),
    FOREIGN KEY (disc_creator_id) REFERENCES disc_creators(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_disc_content_creator ON disc_content(disc_creator_id);
CREATE INDEX IF NOT EXISTS idx_disc_content_published ON disc_content(published_at);

CREATE TABLE IF NOT EXISTS disc_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    criteria_json TEXT NOT NULL,
    match_all INTEGER NOT NULL DEFAULT 0,   -- the "match all criteria" checkbox
    include_scope TEXT,                     -- all_creators | my_creators | not_contacted
    created_at TEXT NOT NULL,
    last_run_at TEXT,
    result_count INTEGER NOT NULL DEFAULT 0,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS disc_search_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_id INTEGER NOT NULL,
    disc_creator_id INTEGER NOT NULL,
    score REAL,
    reasons_json TEXT,                -- the thumbs-up bullet list, pre-rendered
    status TEXT NOT NULL DEFAULT 'result',
    status_changed_at TEXT,
    status_changed_by TEXT,
    first_seen TEXT NOT NULL,
    UNIQUE(search_id, disc_creator_id),
    FOREIGN KEY (search_id) REFERENCES disc_searches(id) ON DELETE CASCADE,
    FOREIGN KEY (disc_creator_id) REFERENCES disc_creators(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_disc_results_search ON disc_search_results(search_id);
CREATE INDEX IF NOT EXISTS idx_disc_results_creator ON disc_search_results(disc_creator_id);
CREATE INDEX IF NOT EXISTS idx_disc_results_status ON disc_search_results(status);

CREATE TABLE IF NOT EXISTS disc_forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    brand_config_json TEXT,
    fields_json TEXT NOT NULL,
    auto_rules_json TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS disc_form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_id INTEGER NOT NULL,
    disc_creator_id INTEGER,          -- set once matched or created
    payload_json TEXT NOT NULL,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'new',   -- new | approved | rejected
    auto_decision TEXT,               -- which auto rule fired, null if manual
    reviewed_by TEXT,
    reviewed_at TEXT,
    submitted_at TEXT NOT NULL,
    source_ip_hash TEXT,              -- hashed, never store the raw address
    FOREIGN KEY (form_id) REFERENCES disc_forms(id) ON DELETE CASCADE,
    FOREIGN KEY (disc_creator_id) REFERENCES disc_creators(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_disc_submissions_form ON disc_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_disc_submissions_status ON disc_form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_disc_submissions_email ON disc_form_submissions(email);

CREATE TABLE IF NOT EXISTS disc_credit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL DEFAULT 'vidiq',
    tool TEXT NOT NULL,
    params_hash TEXT,
    credits REAL NOT NULL DEFAULT 0,
    cache_hit INTEGER NOT NULL DEFAULT 0,
    search_id INTEGER,
    result_count INTEGER,
    balance_after REAL,
    called_at TEXT NOT NULL,
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_disc_credit_called ON disc_credit_log(called_at);
CREATE INDEX IF NOT EXISTS idx_disc_credit_tool ON disc_credit_log(tool);
CREATE INDEX IF NOT EXISTS idx_disc_credit_search ON disc_credit_log(search_id);
"""
'''


def step1():
    step(1, "Append disc_* DDL to the SCHEMA string")
    src = TARGET.read_text()
    if "disc_creators" in src:
        print("[step 1] SKIP: disc_* tables already in SCHEMA")
        return "skip"
    exactly_one(src, STEP1_OLD, "tail of the senders table + SCHEMA close")
    backup(TARGET)
    src = src.replace(STEP1_OLD, STEP1_NEW, 1)
    TARGET.write_text(src)
    syntax_check(TARGET)
    print("[step 1] applied")
    return "ok"


# --- step 2: apply the migration through the app's own interpreter

VERIFY_SRC = r"""
import sys
from outreach import db

EXPECTED = [
    "disc_creators", "disc_creator_accounts", "disc_account_metrics",
    "disc_creator_topics", "disc_creator_games", "disc_content",
    "disc_searches", "disc_search_results", "disc_forms",
    "disc_form_submissions", "disc_credit_log",
]
PRE_EXISTING = ["files", "creators", "saved_mappings", "campaigns", "runs",
                "media_assets", "senders"]

def fail(msg):
    print("VERIFY_FAIL: " + msg)
    sys.exit(1)

# A fresh install has no tables at all yet, so tolerate the absence.
# On an existing install this is the guard that proves the migration did
# not disturb the rows already in the Creator Library.
def creators_count():
    with db.conn() as c:
        row = c.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='creators'"
        ).fetchone()
        if row is None:
            return None
        return c.execute("SELECT COUNT(*) AS n FROM creators").fetchone()["n"]

before = creators_count()
if before is None:
    print("no creators table yet (fresh install), skipping row-count guard")
else:
    print("existing creators row count before: %d" % before)

db.init_schema()

with db.conn() as c:
    names = {r["name"] for r in c.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table'")}

    missing = [t for t in EXPECTED if t not in names]
    if missing:
        fail("tables not created: %s" % missing)
    print("all %d disc_* tables present  OK" % len(EXPECTED))

    gone = [t for t in PRE_EXISTING if t not in names]
    if gone:
        fail("pre-existing table(s) disappeared: %s" % gone)
    print("all pre-existing tables intact  OK")

    after = c.execute("SELECT COUNT(*) AS n FROM creators").fetchone()["n"]
    if before is not None and after != before:
        fail("creators row count changed: %d -> %d" % (before, after))
    print("creators row count unchanged (%d)  OK" % after)

    # Confirm the cascade wiring is real, not merely declared.
    fks = c.execute(
        "SELECT COUNT(*) AS n FROM pragma_foreign_key_list('disc_search_results')"
    ).fetchone()["n"]
    if fks != 2:
        fail("disc_search_results expected 2 FKs, found %d" % fks)
    print("disc_search_results foreign keys wired  OK")

    # The funnel query the Results tabs will run must work.
    c.execute(
        "SELECT status, COUNT(*) AS n FROM disc_search_results "
        "GROUP BY status"
    ).fetchall()
    print("funnel group-by query parses  OK")

    integrity = c.execute("PRAGMA integrity_check").fetchone()[0]
    if integrity != "ok":
        fail("integrity_check returned: %s" % integrity)
    print("PRAGMA integrity_check ok  OK")

print("VERIFY_OK")
"""


def step2():
    step(2, "Run init_schema and verify the new tables")
    py = app_python()
    print(f"[step 2] interpreter: {py}")
    rc, out, err = run([py, "-c", VERIFY_SRC], timeout=300, cwd=str(APP))
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
        print("Note: new tables are additive. If step 2 failed after step 1,")
        print("restoring db.py is enough. No existing table was touched.")
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
