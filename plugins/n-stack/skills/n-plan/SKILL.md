---
name: n-plan
description: "PRD with testable acceptance criteria, then a task graph as GitHub issues with a model per task. Use for \"plan this\", \"write a PRD\", \"break this down\", \"n-plan\"."
disable-model-invocation: true
model: opus
---

# /n-plan — PRD and task graph

Two outputs: **what** we build and why (`docs/product/prd.md`), and **how the work is cut**
(GitHub issues that `/n-build` executes). Precision here is what makes cheap models succeed later.

## 1. Inputs

Read `docs/product/idea.md`, `CLAUDE.md`, `docs/architecture/overview.md` (if any),
`docs/learnings.md`. Existing codebase → dispatch `n-stack:n-scout`: "Which areas does
<feature> touch? Which existing patterns should it follow?" No idea.md and a vague request →
suggest `/n-ideate`, but proceed if the user wants.

## 2. Scope mode (AskUserQuestion, with a recommendation)

**Expand** (the request undersells the opportunity) · **Hold** (build what was asked,
completely) · **Reduce** (smallest version that proves the value).

## 3. PRD

Write `docs/product/prd.md` from `${CLAUDE_SKILL_DIR}/templates/prd.md`:
- Each story's **acceptance criteria are checks** a test can assert (Given/When/Then).
  "Fast" and "intuitive" are not criteria; "renders < 200 ms with 1,000 rows" is.
- **Non-goals**, scope tiers (MVP / v1 / Later), and per-story edge states
  (empty, loading, error, permission denied, offline, concurrent edit).
Show the user the stories and tiers; get agreement before cutting tasks.

## 4. Cut the task graph

Follow `${CLAUDE_SKILL_DIR}/references/task-graph.md` exactly: walking skeleton first,
vertical slices, ≤ ~5 files and one verify per task, tests inside each task, a model per task
by the rubric there. Tag 1-2 instructive tasks `me` if the user wants to build some themselves
(learning mode).

Write the spec to `docs/product/plan.json` (format in the reference; it's committed, so the
plan survives even before GitHub is connected), then:
```bash
nstack-tasks create docs/product/plan.json --dry-run   # show the user the issues
nstack-tasks create docs/product/plan.json             # after approval
nstack-tasks check                                     # no cycles, deps exist
```
**New project without GitHub or `/n-init` yet** (`gh repo view` fails or no
`.n-stack/config.json`): stop after the dry run. The issues are created at the end of
`/n-init`, once the stack is chosen and the repo exists. If `/n-architect` adds tasks, it
appends them to the same `plan.json`.

## 5. Check before finishing

- [ ] Every MVP acceptance criterion maps to at least one task.
- [ ] Parallel-ready tasks don't share files.
- [ ] No `haiku` task needs a design decision; first-of-a-pattern tasks are `opus`.
- [ ] Add `<!-- nstack-doc covers="..." -->` to the PRD only if it describes specific code
      paths (usually it doesn't; architecture and design docs do).

Commit the PRD: `docs: PRD for <feature>`.

## Report

```
PRD: docs/product/prd.md — <N> stories, MVP = <list>
TASKS: #a–#b in <M> milestones (<x> opus / <y> sonnet / <z> haiku / <w> me)
CRITICAL PATH: #a → #c → …
NEXT: /n-architect (new components/data/integrations) · /n-design (new screens) · /n-build
```
