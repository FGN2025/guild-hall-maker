# Close the marketing-agent reliability checkpoint

## Goal
Finish and verify the existing run-reliability work before beginning the approved FGN merit and Scouts advancement implementation.

## Confirmed baseline
- Two instrumented scratch runs completed on `college test 1`; the productive run created the planned 3 campaigns and 3 assets across 7 continuations.
- The measured turn durations support the current adaptive reserve bounds.
- The replay created no duplicate rows, and the scratch events and generated rows are already absent.
- Work-derived continuation limits, the five-handoff no-progress stop, credit-blocked runs, and required idempotency keys are present.
- The remaining scoring issue is that a successful replay with zero new rows is marked incomplete because completeness currently counts only rows newly created during that invocation.

## Changes
1. **Make completion replay-aware**
   - Measure fulfilled planned work, including rows returned through idempotent reuse, without treating duplicates as new output.
   - Keep normal first-run completeness based on the preflight’s campaign, asset, and post expectations.
   - Preserve `pending_review`; do not approve, publish, dispatch, or modify the kill switch.

2. **Add deterministic reliability proofs**
   - Test measured reserve behavior from recorded turn durations.
   - Test the continuation budget and five-consecutive-handoff no-progress boundary.
   - Test preflight credit blocking and mid-run credit exhaustion classification.
   - Test first-run, interrupted-resume, and replay outcomes across all four create paths.

3. **Clarify run outcomes for operators**
   - Show blocked runs as a distinct filter and summary state.
   - Mark clean-but-incomplete runs visibly instead of presenting them as ordinary successes.
   - Add labels and guidance for continuation-budget, no-progress, and insufficient-credit outcomes.

4. **Define the trailing-ten measure**
   - Calculate it per tenant from the ten latest terminal monthly seed runs.
   - Report sample size, successful exits, complete runs, and average completeness.
   - Count a run as reliable only when it terminates successfully and fulfills its planned work within the existing tolerance; replay verification is reported separately.

5. **Close the checkpoint**
   - Run focused regression tests and a safe read-only reconciliation of the two existing scratch runs.
   - Confirm scratch fixtures and generated rows remain absent.
   - Update the roadmap only for items proven by code, tests, and live records.

## Technical constraints
- No challenge, achievement, merit, or Scouts catalog changes in this checkpoint.
- No Acme test runs and no changes to approved posts, marketing approvals, publishing, dispatch state, queues, storage, or the kill switch.
- Any live verification stays on `college test 1`; cleanup is narrowly scoped to verification-owned records only if new records are explicitly required.
- Existing tenant/platform role boundaries and the agent’s `pending_review` ceiling remain unchanged.
