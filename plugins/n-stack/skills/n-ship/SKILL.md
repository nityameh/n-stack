---
name: n-ship
description: "Ship: gate script, PR, CI watch-and-fix, merge and deploy on confirmation. Run only via /n-ship."
disable-model-invocation: true
model: sonnet
---

# /n-ship — from green branch to production

Pushing, merging and deploying are outward-facing: each needs the user's explicit "yes"
in this session.

## 1. Gate (a script, not judgment)

```bash
nstack-gate --base origin/<default branch>
```
It checks the branch, the review record (PASS, no open P0/P1, covers HEAD), the QA record,
docs drift, migration safety, gitleaks over the branch, and verify. **Any FAIL → stop**,
show the output and the skill that fixes it (`/n-review`, `/n-test`, `/n-docs`, `/n-debug`).
Never edit a review or QA record to make the gate pass.
If `.n-stack/config.json` has `security: always`, or the branch touches auth/payments/PII and
it's `ask`, offer `/n-secure` before continuing.

## 2. Sync with base

`git fetch origin`; ask **rebase (recommended for a solo branch) or merge**. Resolve conflicts
by understanding both sides; show the user anything non-trivial. Code changed → re-run the gate.

## 3. Changelog

Add user-facing changes under `## Unreleased` in `CHANGELOG.md` (Keep-a-Changelog; create if
missing). Commit `docs: changelog for <feature>`.

## 4. Push and PR — confirm first

Show branch, commits, PR title, and the issues it closes. On "yes":
```bash
git push -u origin HEAD          # pre-push hook: gitleaks + verify
gh pr create --title "<conventional title>" --body-file <filled ${CLAUDE_SKILL_DIR}/templates/pr-body.md>
```
The body opens with three plain lines (what, why, how verified), lists `Closes #a, #b` for
every task built on the branch, and links PRD, review, QA and learning entries.

## 5. CI loop (bounded)

`gh pr checks --watch --fail-fast`. Failure → `gh run view <id> --log-failed > .n-stack/tmp/logs/ci.log`,
`n-stack:n-log-triager` on it, diagnose (escalate to Opus reasoning if not obvious), fix,
verify locally, push. Max 3 rounds, then stop and report.

## 6. Merge and deploy — confirm each

- Merge only when the user says so: `gh pr merge --squash --delete-branch` (or the repo's
  convention). Merging closes the task issues.
- Deploy settings in `docs/deploy.md`; missing → ask platform, production URL, deploy and
  rollback commands, health URL; write it.
- Deploy only on confirmation; then health check + a quick Playwright smoke of the main flow.
  Failure → report and offer the rollback command; never hot-fix production in place.
- `git tag v<x.y.z>` on release (also snapshots every doc at that version).

`nstack-event skill_run skill=n-ship outcome=<merged|deployed|blocked> ci_rounds=<n>`

## Report

```
GATE: PASS · PR: <url> — CI <green> · CLOSES: #a, #b
MERGED: <yes/no> · DEPLOYED: <yes/no> → <url> (health <ok>)
NEXT: /n-retro (milestone done) · /nstack
```
