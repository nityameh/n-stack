---
name: n-review
description: "Branch review: static analyzers first, then a read-only Opus staff reviewer; verified findings and a record the ship gate checks. Use for \"review\", \"is this ready\", \"find bugs\", \"n-review\"."
disable-model-invocation: true
---

# /n-review — tools first, then an Opus staff review

Order matters: machines catch the mechanical problems for free, so the expensive reviewer
spends its attention on logic. The reviewer did not write the code, so it doesn't share the
author's blind spots.

## 0. Fresh session

Review once per milestone or branch, not per task, and not inside a long build session: the
reviewer needs files, not chat history, and old context is re-billed on every turn. If this
conversation already holds build work, tell the user to `/clear` and re-run `/n-review`
(branch, commits and the task issues carry everything).

## 1. Scope and inputs (files, so the reviewer stays read-only)

```bash
BASE=$(git symbolic-ref -q --short refs/remotes/origin/HEAD 2>/dev/null || echo main)
mkdir -p .n-stack/tmp/review
git diff "$BASE"...HEAD > .n-stack/tmp/review/diff.patch
git diff --stat "$BASE"...HEAD
git rev-parse --short HEAD
```
Nothing to review → stop. Uncommitted work → ask to commit first (the record pins a commit).

## 2. Static checks (no model tokens)

Run each command in `.n-stack/config.json` → `static`, plus `gitleaks git --log-opts="$BASE..HEAD" --redact --no-banner`,
saving output to `.n-stack/tmp/review/static-<tool>.txt`. Real findings there are fixed or
listed in the record as findings from that tool; the reviewer is told not to repeat them.

## 3. Opus review

Diff ≤ ~800 changed lines → one `n-stack:n-staff-reviewer`. Larger → split by area
(backend / frontend / data+migrations) and dispatch reviewers in parallel, one message.
Give each: the diff and static file paths, `docs/product/prd.md`,
`docs/architecture/overview.md`, the task issue numbers (`nstack-tasks show <n>` for their
acceptance criteria), and its focus. Security-sensitive diff (auth, payments, permissions,
uploads, raw SQL) → add "Security focus". Migrations in the diff → the reviewer walks
`${CLAUDE_SKILL_DIR}/references/migration-safety.md`.

## 4. Verify findings (cheap, targeted)

For each **P0/P1**, open the cited lines and confirm the failure scenario is real
(confirmed / plausible → question / wrong → drop). P2s with evidence lines are kept without
re-reading. Merge duplicates. Also check every task's acceptance criteria is implemented and
tested.

## 5. Act

Present P0/P1 in full and P2 as one line each (the full text lives in the record, step 6),
then AskUserQuestion: **Fix all P0/P1 now (recommended) ·
Pick which · Report only**. Fixes: mechanical → `n-stack:n-implementer` (sonnet) with a brief;
subtle → yourself. Behaviour changes get a test. Commit `fix(review): <what>` (the ship gate
accepts these after the reviewed commit).

## 6. Record

Write `docs/reviews/<YYYY-MM-DD>-<branch with / → ->.md` from
`${CLAUDE_SKILL_DIR}/templates/review.md` — the gate parses `Head reviewed:`, the findings
table (`| n | P1 | … | open |`), `Migration safety:` and `**PASS**`/`**BLOCKED**`. Commit it.

`nstack-event skill_run skill=n-review outcome=<pass|blocked> findings=<n> confirmed=<c> dropped=<d> reviewers=<k>`

## Report

```
REVIEWED: <base>..<sha> (<files>, <lines>) · static: <tools run, findings>
FINDINGS: P0 <a> · P1 <b> · P2 <c> — fixed <x>, open <y> · dropped <d> false positives
GATE: PASS | BLOCKED → docs/reviews/<file>
NEXT: /n-test · or fix open items
```
