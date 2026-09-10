# Agent run reliability: findings, then the fix

## Headline finding, which changes the framing

The "7 of 14 failed" number is real but it is not a current failure rate. Six of the seven
failures happened between Jul 28 and Aug 05 02:31, all on prompt v1-v3, and every one of
them is a failure class that was subsequently fixed. Since the Aug 05 streaming/slice
hardening landed there have been four runs: three completed, one failed. The current
lane is 3/4, and the single modern failure has one specific cause.

That does not make the lane a product. It makes the remedy narrower than "the agent is
unreliable".

---

## Step 1: all seven failures, by mechanism

| id | date | label | turns / cap | conts | dur | written before death | transcript |
|---|---|---|---|---|---|---|---|
| `7ab7a2cd` | Jul 28 23:30 | stalled: runner terminated | 0 / 40 | 0 | 0s | nothing | 0 |
| `13529324` | Jul 29 00:17 | stalled: runner terminated | 4 / 100 | 0 | 150s | nothing | 0 |
| `e23d7aa4` | Jul 29 01:04 | watchdog: no progress | 4 / 100 | 0 | 187s to last beat | nothing | 0 |
| `a28e440f` | Aug 05 00:28 | anthropic_timeout after 60000ms | 2 / 100 | 2 | 99s | 1 campaign | 5 |
| `c8a4ec22` | Aug 05 00:36 | anthropic_timeout after 60000ms | 2 / 100 | 2 | 93s | nothing | 5 |
| `962a25bd` | Aug 05 00:54 | Anthropic 400 credit balance too low | 9 / 100 | 8 | 143s | 1 campaign, 1 post, 2 assets | 19 |
| `8f31b65c` | Aug 25 23:13 | continuation_limit_exceeded | 70 / 100 | 60 / 60 | 746s | 14 campaigns, 21 posts, 21 assets | 141 |

What actually happened, in three groups:

**Group A, the three July runs, are one mechanism: platform worker kill.** Transcript
length 0 and `heartbeat_at` null or stuck at ~187s. The slice budget was 200s at the time,
above the edge worker's real wall-clock ceiling. The platform terminated the worker
mid-turn, so no JS exception fired, no catch ran, and no transcript was ever written.
`stalled` and `watchdog` are two different observers noticing the same corpse: `stalled`
is the caller seeing the invocation die, `watchdog` is the SQL sweeper
(`fail_stalled_agent_runs`, 5-minute heartbeat threshold) reaping a row left `running`.

**Group B, the two Aug 05 timeouts and the credit failure, are pre-fix and mid-fix.**
Covered in steps 2 and 3.

**Group C is `8f31b65c`, the only modern failure.** Covered in step 3.

Note: `failure_kind` is null on six of seven. Classification was added later, and the one
row that has it is mislabelled `timeout` for what is actually budget exhaustion.

---

## Step 2: the 60000ms timeout — the fix did not regress

You were right to suspect it and wrong about which of the three it is. It is none of them:
those two rows predate the fix by minutes.

The current code (`supabase/functions/agent-run/index.ts:204-226, 348-355`) is streaming,
with token-arrival idle detection and a ceiling that is **not** 60s:

```
const ANTHROPIC_IDLE_MS = 45_000;   // primary liveness: abort only if the stream stalls
const ANTHROPIC_TOTAL_MS = 90_000;  // defence in depth
```

The only place that string can be produced is:

```ts
const failure = () =>
  aborted === "idle"
    ? new Error(`anthropic_stream_idle: no tokens for ${ANTHROPIC_IDLE_MS}ms`)
    : new Error(`anthropic_timeout after ${ANTHROPIC_TOTAL_MS}ms`);
```

With today's constant that message can only read `after 90000ms`. A row saying `60000ms`
can only have been written by the pre-streaming code, which had a flat 60s abort. The
timestamps confirm it: the two rows are 00:28 and 00:36 on Aug 05, and the next run at
01:04 (`b7b975f8`) completed cleanly with 23 turns. The fix shipped in that half hour.
There is no second path — `callAnthropic` is the only caller of the Anthropic API in the
runner. Timeouts are also now classified transient and retried
(`isTransientModelError`, line 322), then end the slice for resume rather than killing
the run.

**Conclusion: no regression, no second path. Those are historical rows.** The real defect
they expose is a reporting one: failed runs are never aged out or version-stamped, so a
dashboard that counts "7 of 14" is counting three generations of code as if they were one.

---

## Step 3: the continuation limit — cap too low, not slow progress

Evidence from `8f31b65c`: 70 turns, 141 transcript entries, 746 seconds, and it produced
14 campaigns, 21 posts and 21 assets before dying. That is ~0.8 committed rows per turn on
a workload whose preflight expected 23 campaigns / 39 posts / 39 assets. Progress per turn
is healthy. It was roughly 55% done and moving.

The binding limit was not `turn_cap` (100, only 70 used). It was `MAX_CONTINUATIONS = 60`,
hit exactly. So the question is why 70 turns needed 60 continuations — 1.17 turns per
invocation.

That is the mechanism, and it is a budget arithmetic problem:

```
const SLICE_BUDGET_MS = 70_000;
const TURN_RESERVE_MS = 60_000;
// loop: if (turnsThisSlice > 0 && elapsed + turnReserve > sliceBudget) hand off
```

With a 60s reserve against a 70s budget, any slice whose first turn takes more than 10
seconds hands off immediately after that one turn. Calendar-seed turns take far more than
10s. So the runner is structurally pinned near one turn per invocation, and each handoff
costs a fresh cold start plus a full transcript round-trip that grows as the transcript
grows. 60 continuations is therefore ~60 turns of ceiling, on a job that needs ~120.

Raising `MAX_CONTINUATIONS` alone would work this month and fail next month. The
proportionate fix is to make each slice carry more turns, and to make the ceiling a
function of remaining work rather than a constant.

---

## Step 4: the stalls and the watchdog — the guard was right

Both `stalled` runs and the `watchdog` run have transcript length 0 and no usable
heartbeat. The runner had written nothing, so it was not doing productive work that a
guard interrupted. `13529324` died at 150s and `e23d7aa4` last beat at 187s, both against
a 200s slice budget — the worker was killed by the platform before it could reach its own
handoff point.

This is the opposite of the earlier incident you are remembering. Here the guard fired
after the process was already gone, and its only sin was being slow (5 minutes) to
declare a run that had been dead for minutes. Its verdict was correct in all three cases.
The bug was the 200s budget, which was already fixed by dropping to 70s.

The residual issue is honesty of state, not safety: a run can sit `running` for up to five
minutes after it is dead, and `e23d7aa4` shows `dur_s` of 583522 because `finished_at` was
stamped when the sweeper eventually ran, not when the run died.

---

## Step 5: the plan

### 5.1 Resumability — the transcript is sufficient, the ceiling is the gap

Full resumability already exists and works. `transcript` is persisted as jsonb after every
single turn and again after every tool-result batch; `handOff` re-invokes the function with
`resume_run_id`; `driveRun` rehydrates `initialMessages`, `turns_used`, token counters and
`continuation_count`. `8f31b65c` resumed 60 times successfully. This is not the missing
piece.

What is missing is that resumption is capped by a constant unrelated to the work.
Proposed:

- Raise turns-per-slice by cutting `TURN_RESERVE_MS` from 60s to a measured value.
  The reserve should be the observed p95 turn duration, not a guess. Instrument per-turn
  duration first (it is not recorded today), then set it. Expect 3-6 turns per slice.
- Replace the flat `MAX_CONTINUATIONS` with a budget derived from preflight: the run
  already computes an expected item count, so the ceiling becomes
  `expected_units x safety factor`, floored at today's 60. A run that legitimately needs
  120 turns gets 120.
- Add a **no-progress** continuation guard so the raised ceiling cannot become an infinite
  loop: if N consecutive continuations commit zero new rows, fail with a distinct
  `no_forward_progress` kind. This is the actual danger of raising a cap, and it is the
  right thing to guard on rather than raw count.

### 5.2 Credit exhaustion as a pre-flight state

Today `962a25bd` discovered it at turn 9 as a raw `Anthropic 400: {...}` string stored in
`error_message` and shown to a tenant admin. Proposed:

- A pre-flight balance probe before turn 1: a minimal model call, or the gateway's own
  balance signal. On insufficient balance the run never starts — it is created directly in
  a terminal `blocked` status with `failure_kind = 'insufficient_credits'`, a plain-English
  message naming the fix, and zero rows written.
- Mid-run detection classified the same way rather than as a generic failure, ending the
  slice cleanly with everything committed so far preserved and resumable once topped up.
- Never surface a provider error body in tenant-facing UI.

### 5.3 Where I disagree with the shape

Two places.

First, resumability is presented as the structural answer, and it is already built. The
structural answer is **budget derived from work rather than constants**, plus a progress
guard. If we ship "resumability" we will ship something that already exists and the lane
will fail the same way.

Second, I would not fix the continuation cap without also fixing the July-generation rows
polluting the metric. Otherwise step 6's measurement starts from a baseline that mixes
three code generations, and we will not be able to tell whether the fix worked.

### 5.4 Definition of done

- Metric: completion rate over the last 10 `monthly_calendar_seed` runs, computed from
  `agent_runs`, not remembered. Target: **10 consecutive completions**, with a standing
  alert if the trailing-10 rate drops below 90%.
- Stored, not vibed: stamp every run with the runner `BUILD_ID` and prompt version it ran
  under, so a rate is always attributable to a code generation. Add per-turn duration and
  per-continuation committed-row deltas, which are the two numbers this investigation
  needed and had to infer.
- A run is "complete" only when its committed row count matches its preflight expectation
  within tolerance. `8f31b65c` would have failed that test at 55% even if it had exited
  cleanly, and a run that quietly under-produces is the failure mode we would otherwise
  miss.

### 5.5 Constraints and how idempotency gets proven

No row moves past `pending_review`. Nothing in this plan touches approval, dispatch or the
kill switch.

On double-insert across a resume boundary, the protection already exists and is in use:
`scheduled_posts` carries `idempotency_key` with a partial unique index
`(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL`, and all 62 existing rows
have a key. The risk is not that it is absent, it is that it is only enforced where a key
is actually supplied.

Proof, not assurance:

1. Audit that every agent-writable table with a create path (`scheduled_posts`,
   `marketing_campaigns`, `tenant_marketing_assets`) has both the column and the unique
   index, and that the MCP tools make `idempotency_key` required rather than advisory.
2. A deliberate resume-boundary test: run a seed against a scratch tenant, kill the runner
   mid-batch, resume, and assert the committed row count equals the count from an
   uninterrupted run of the same scope.
3. A replay test: re-send an identical tool call and assert it returns the existing row id
   rather than inserting, and that the row count does not move.
4. Store the assertion as a regression test in `src/test/`, so the proof survives.

---

## Not in scope

No September re-seed. Not started, not planned here.
