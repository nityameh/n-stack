---
name: nstack
description: "n-stack router: reads project state and names the next lifecycle step. Use for \"nstack\", \"what's next\", \"where are we\", \"which skill\"."
---

# n-stack router

Answer one question: **what is the next right step?** Don't run the stage unless asked.
The SessionStart hook already printed branch, uncommitted files, last verify, stale docs
and in-progress tasks; reuse that instead of re-checking.

## 1. Read state (cheap checks only)

```bash
ls CLAUDE.md .n-stack/config.json docs/product/idea.md docs/product/prd.md \
   docs/architecture/overview.md docs/design/decisions.md 2>&1
ls docs/reviews docs/qa 2>/dev/null | tail -4
git log --oneline -5
nstack-tasks ready 2>&1 | tail -6
```

## 2. Map state to the next step (first match wins)

| State | Next |
|---|---|
| New project (no source code yet) and no `idea.md` | `/n-ideate` (`/n-init` comes after `/n-architect` picks the stack) |
| New project with `idea.md` but no `prd.md` | `/n-plan` |
| New project with `prd.md` but no `architecture/overview.md` | `/n-architect` |
| No `.n-stack/config.json` or no `verify` in it | `/n-init` |
| An idea but no `idea.md` | `/n-ideate` |
| `idea.md` but no `prd.md` or no `n-task` issues | `/n-plan` |
| PRD adds services, data stores, integrations or scale targets; no architecture | `/n-architect` |
| PRD has screens with no entry in `design/decisions.md` | `/n-design` |
| Something is failing (red verify, failing test, pasted error) | `/n-debug` |
| Ready or in-progress tasks | `/n-build` |
| Commits on the branch with no review file covering them | `/n-review` |
| Reviewed, no QA record for the branch | `/n-test` |
| Session start reported stale docs | `/n-docs` |
| Touches auth, payments, uploads, PII, or a public endpoint, and no security pass yet | `/n-secure` (optional) |
| Reviewed, tested, docs current | `/n-ship` |
| A milestone just shipped, or ~2 weeks since the last retro | `/n-retro` |

Small work skips stages: bug fix = `/n-debug → /n-review → /n-ship`.
Full graph: `${CLAUDE_SKILL_DIR}/references/lifecycle.md` (only if the user asks how stages connect).

## 3. Answer (≤ 8 lines)

```
STAGE: <where the project is>
DONE: <artifacts / closed milestones>
NEXT: /n-<skill> — <one-line reason>
THEN: /n-<skill> → /n-<skill>
```
