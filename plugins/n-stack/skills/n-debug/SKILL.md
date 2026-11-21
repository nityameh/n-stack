---
name: n-debug
description: "Disciplined debugging: Haiku reads logs, Opus forms and tests hypotheses, minimal fix plus regression test. Use for failures, errors, stack traces, \"it's broken\", \"n-debug\"."
---

# /n-debug — reproduce, reason, fix, prevent

Fix the cause, not the symptom, and leave a test that would have caught it. Division of
labour: **Haiku reads, you (Opus) reason.**

## 1. Get the facts (keep raw logs out of this context)

Save the failure output to `.n-stack/tmp/logs/<slug>.log` (re-run with output redirected, or
save what the user pasted). Over ~30 lines → dispatch `n-stack:n-log-triager` on the path; it
returns the failed step, first error, location, timeline and stated facts — no diagnosis.
Shorter → read it directly. Check `docs/learnings.md` for a known gotcha.

## 2. Reproduce

Smallest reliable reproduction, ideally a **failing test** at the lowest level that shows the
bug (unit > integration > E2E). Can't reproduce → collect more evidence (exact input,
environment, versions, timing) before touching code. Intermittent → suspect shared state,
ordering, time, or a race.

## 3. Reason — hypotheses, predictions, experiments

1. List 2-4 hypotheses that explain **all** the facts, most likely first. A hypothesis that
   ignores a fact is wrong.
2. For each: the **prediction** ("if X, then Y shows Z") and the cheapest experiment that
   tests it — a log line, a breakpoint, a narrower test, `git bisect` for regressions,
   halving the input. Use the `LSP` tool / code map to trace the code path exactly.
3. One variable per experiment. Record each result in one line.
4. Three hypotheses down → step back: re-read the first error, check assumptions (right
   branch, env, stale build or cache?), or ask `n-stack:n-planner` for fresh hypotheses with
   the facts so far.

## 4. Fix

Smallest change that fixes the **cause**; a large right fix becomes a task. The reproduction
test passes, project verify is green (the Stop hook checks), temporary logging removed.
`Grep` for the same pattern elsewhere and list other instances.

## 5. Prevent and record

- Keep the regression test, named for the behaviour (`does not double-charge on retry`).
- Non-obvious cause → `docs/learnings.md` (rule + why + where).
- Did this bug pass an earlier `/n-review`? (`git log` the faulty line, check if its commit
  is older than a review record.) If yes, it **escaped review**:
  `nstack-event escaped_defect area=<area> class=<bug class> stage=<review|test>` — this is
  how `/n-retro` finds blind spots in the review checklist.
- `nstack-event skill_run skill=n-debug outcome=fixed hypotheses=<n>`

## Report

```
CAUSE: <one sentence>
EVIDENCE: <the experiment that proved it>
FIX: <files, one line each>
TEST: <regression test> (failed before, passes now)
ALSO AFFECTED: <other instances or "none found">
TECHNIQUE: <the debugging move that cracked it>
NEXT: /n-review
```
