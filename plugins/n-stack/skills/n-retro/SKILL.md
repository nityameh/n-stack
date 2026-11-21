---
name: n-retro
description: "Evidence-driven retro: event log + git → at most 3 improvements to the project or n-stack. Use for \"retro\", \"what should we improve\", \"n-retro\"."
disable-model-invocation: true
model: opus
---

# /n-retro — measure, then improve the system

The loop: **hooks and skills record evidence → this skill reads it → you change one thing →
the next retro shows whether it helped.** Opinions are cheap; counts are evidence.

## 1. Gather (no model work)

```bash
nstack-retro --days 14            # this project
nstack-retro --days 30 --all      # all projects, for n-stack-wide patterns
nstack-retro --days 14 --cost     # adds token cost via ccusage (optional)
git log --since=14.days --format='%h %s' | head -60
```
Also read the latest `docs/retro/*.md` (what we changed last time and what we expected).

## 2. Read the signals

`${CLAUDE_SKILL_DIR}/references/signals.md` maps each number to what it means and which
part of n-stack to change. Look for:
- **Escaped defects** (bugs found after review/test) by class → review checklist gaps.
- **Review false-positive rate** (dropped / findings) > ~30% → reviewer prompt too loose.
- **Verify attempts per task and escalations** by model tier → routing rubric miscalibrated
  (e.g. many sonnet → opus escalations for one kind of task).
- **Stop-gate fails** → agents declaring done on red; briefs missing the verify step.
- **Guard blocks** by rule → what agents keep trying (weakening tests, reading .env).
- **After-edit failures** → which checks bite most; maybe a convention for CLAUDE.md.
- **Cost** per period vs work shipped (tasks closed, PRs merged).

## 3. Decide (max 3 changes)

For each pattern: evidence → cause → **one** change → how the next retro will tell if it
worked. Changes go to the lowest level that fixes it (a project `CLAUDE.md` line, a
`docs/learnings.md` rule, a checklist item, a skill step, a model tag rule, a hook). Ask the
user which to apply. Skill/agent/hook changes → `/n-forge` with the evidence attached.

Last retro's changes: did their metric move? Keep, adjust or revert them.

## 4. Record

Write `docs/retro/<YYYY-MM-DD>.md`: the numbers, the 3 changes, the expected effect, and the
metric to watch. Commit.

## Report

```
PERIOD: <dates> · TASKS: <closed> · PRS: <merged> · COST: <if measured>
TOP SIGNALS: 1. … 2. … 3. …
CHANGES: 1. <change> → <metric to watch> …
LAST TIME: <change> → <worked / didn't / unclear>
NEXT: /n-forge <skill> (if approved) · /nstack
```
