# play.fgn.gg → fgn.academy Integration Guide

## Finalized Contract — March 2026

## 1. Overview

play.fgn.gg automatically syncs challenge completion data to fgn.academy's Skill Passport. This document is the single source of truth for the payload contract between both systems.

## 2. Authentication

**Header:** `X-Ecosystem-Key: <ECOSYSTEM_API_KEY>`

This is a long-lived static key shared between both systems. No OAuth tokens or refresh flows required. The `X-Ecosystem-Key` header is the only auth header used. (The legacy `X-App-Key`/`FGN_ACADEMY_API_KEY` was retired in P-3.)

## 3. Canonical Endpoint

**URL:** Configured per-tenant in `tenant_integrations.additional_config.api_url`

**Default fallback:** `https://fgn.academy/api/ecosystem/challenge-completed`

**Supabase function URL:** `POST {SUPABASE_URL}/functions/v1/sync-challenge-completion`

**Method:** POST

**Content-Type:** `application/json`

## 4. Payload Contract (Flat Format)

play.fgn.gg sends a flat payload. All top-level fields use underscore naming.

```json
{
  "user_email": "player@example.com",
  "challenge_id": "uuid-of-challenge",
  "score": 85,
  "completed_at": "2026-03-27T15:30:00.000Z",
  "task_progress": [
    {
      "task_id": "uuid-of-task-1",
      "title": "Complete tutorial level",
      "completed": true,
      "status": "completed",
      "completed_at": "2026-03-27T14:00:00.000Z"
    },
    {
      "task_id": "uuid-of-task-2",
      "title": "Win ranked match",
      "completed": false,
      "status": "pending",
      "completed_at": null
    }
  ],
  "skills_verified": ["difficulty:intermediate", "game:Rocket League", "gaming-proficiency"],
  "metadata": {
    "source": "play.fgn.gg",
    "game_name": "Rocket League",
    "difficulty": "intermediate",
    "awarded_points": 850,
    "max_points": 1000
  }
}
```

### 4.1 Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_email` | string | Yes | Player's email for cross-ref identity resolution |
| `challenge_id` | uuid | Yes | The challenge UUID from play.fgn.gg |
| `score` | integer 0–100 | Yes | Completion quality score |
| `completed_at` | ISO 8601 | Yes | Timestamp of completion |
| `task_progress` | array | No | Per-task completion status (see §5) |
| `skills_verified` | string[] | No | Free-form skill tags (no fixed taxonomy) |
| `metadata` | object | No | Extra context fields; academy may store or ignore |

## 5. task_progress Format

The academy accepts both formats for backward compatibility:

| Field | Type | Notes |
|-------|------|-------|
| `task_id` | uuid | Required — references `challenge_tasks.id` |
| `title` | string | Optional — human-readable task name, stored in metadata |
| `completed` | boolean | `true` if task is done; academy checks this first |
| `status` | string | Alternative to `completed`; `"completed"` maps to `true`, anything else is `false` |
| `completed_at` | ISO 8601 \| null | Timestamp when task was completed, `null` if pending |

## 6. Score Normalization

play.fgn.gg calculates score as:

```
score = Math.round((awarded_points / max_points) × 100)
```

- If `max_points` is 0 but `awarded_points > 0`, score defaults to 100.
- If both are 0, score is 0.
- **Academy fallback:** If `score` is missing from the top-level payload, the academy will compute it from `metadata.awarded_points` and `metadata.max_points` using the same formula.

## 7. skills_verified Tags

Tags are free-form strings — no fixed taxonomy. play.fgn.gg currently sends:

| Tag Pattern | Example | Source |
|-------------|---------|--------|
| `difficulty:<level>` | `difficulty:intermediate` | `challenges.difficulty` column |
| `game:<name>` | `game:Rocket League` | `games.name` via challenge FK |
| `gaming-proficiency` | `gaming-proficiency` | Always included |

## 8. Nested Payload Tolerance (Academy Side)

During migration, the academy's normalization layer also accepts nested payloads and flattens them:

| Nested Path | Flattened To |
|-------------|-------------|
| `player.email` | `user_email` |
| `challenge.id` | `challenge_id` |
| `player.display_name` | `metadata.display_name` |
| `player.external_id` | `metadata.external_user_id` |

**Note:** play.fgn.gg now sends flat payloads natively. This tolerance exists only for backward compatibility.

## 9. Health Check Endpoint

**URL:** `POST {supabase_url}/functions/v1/health-check-play`

**Auth:** `X-Ecosystem-Key` header

Returns service status without transferring data. Use for connection monitoring.

## 10. Resolved Questions

**Q1: Which endpoint?**
The academy API route (`/api/ecosystem/challenge-completed`) is canonical. The Supabase function URL is used for direct integration.

**Q2: Flat or nested?**
Flat is required. Academy adds a normalization layer for transitional nested payloads, but play.fgn.gg now sends flat natively.

**Q3: Score mapping?**
`score = round((awarded_points / max_points) × 100)`. Academy fallback reads `metadata.awarded_points / metadata.max_points` if score is missing.

**Q4: skills_verified taxonomy?**
Free-form tags. play.fgn.gg defines its own tags (`difficulty:X`, `game:X`, `gaming-proficiency`). No fixed taxonomy enforced.

**Q5: X-Source-App header?**
Removed. `X-Ecosystem-Key` is the only auth header. Source identification moved to `metadata.source` field.

**Q6: Extra fields?**
Extra context (`display_name`, `difficulty`, `game_name`, `awarded_points`, `max_points`) goes in the `metadata{}` object.

## 11. Pass/Fail Threshold

A score of **70 or above** is treated as a pass (`completed` status). Below 70 is `failed`. XP and credentials are only awarded on pass.
