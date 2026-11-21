# The evidence loop: how n-stack improves itself

Skills are prompts; prompts drift from what works unless something measures them.

```
 work happens ──▶ hooks + skills log events ──▶ /n-retro aggregates ──▶ ≤ 3 changes
      ▲                (~/.n-stack/events.jsonl)       (counts, trends)        │
      └──────────────── /n-forge applies them, commit says why ◀───────────────┘
                         next /n-retro checks the metric moved
```

## 1. Collect (automatic, zero tokens)

| Source | Events |
|---|---|
| Hooks | `session_start`, `guard_block` (rule), `guard_override`, `after_edit_fail`, `verify` (pass/fail, via stop), `worktree_create`, `command` (which `/n-*` ran), `agent_done` (which agent) |
| Skills (`nstack-event`) | `skill_run` (skill, outcome, attempts, escalations, findings, confirmed, dropped, bugs, mutation score), `escaped_defect` (class, stage), `idea_session` |
| Git | `fix:` commits, review/QA records, commits after review |
| ccusage | token cost per day (`nstack-retro --cost`) |

Only names and counts are logged — never prompt text or code. The log stays on your machine.

## 2. The questions the evidence answers

- **Is review catching bugs?** Escaped defects by class. Each one either becomes a checklist
  item, a static rule, or a test pattern.
- **Is review precise?** Dropped findings / total. High → tighten the reviewer prompt.
- **Is routing right?** Attempts and escalations by model tier. Many Sonnet → Opus escalations
  on one kind of task → change the rubric so that kind starts on Opus.
- **Are agents cutting corners?** Guard blocks and stop-gate fails by rule.
- **Is it worth the cost?** Tokens per closed task or merged PR, over time.
- **Which stages are dead weight?** Commands never used → simplify (or move to n-kit).

## 3. Change one thing at a time

Each retro proposes at most 3 changes, each with the metric that should move. `/n-forge`
applies them at the lowest level that works (a deterministic hook beats a prompt line) and
records the evidence in the commit message. The next retro checks whether the metric moved,
and keeps, adjusts or reverts the change.

## 4. Later: regression tests for skills

When a skill change matters, capture the failing case as a fixture (a small repo + prompt +
expected outcome) under `plugins/n-stack/evals/` and run it with `claude plugin eval` before
and after the change. That turns "the skill feels better" into a pass/fail check.
