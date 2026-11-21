# Model routing

Rule: **use the cheapest model that is reliably right.** A cheap model that gets it wrong
is the most expensive option: the redo runs on a bigger model with a polluted context.

## Who does what

| Work | Model | Why |
|---|---|---|
| Reading logs, CI output, stack traces → faithful summary | **Haiku** (`n-log-triager`) | Reading and filtering. It reports facts only; it never diagnoses. |
| Codebase reconnaissance → file/line map | **Haiku** (`n-scout`) | Search and summarize. |
| Mechanical edits (config, rename, copy a pattern verbatim) | **Haiku** (`n-implementer` with override) | No design decisions. |
| Well-specified implementation, tests, test-first, docs sync, QA runs, shipping | **Sonnet** | Clear spec + existing pattern. |
| Ideation, PRD, architecture, design exploration, first-of-a-pattern code, security logic, concurrency, migrations | **Opus** | Ambiguity and judgment. |
| Root-cause diagnosis | **Opus** (the session) | Reasoning over facts Haiku collected. |
| Code review of the branch | **Opus** (`n-staff-reviewer`) | Review is high-leverage: a missed bug costs far more than a review. |
| Per-task diff check during build | **Opus** (the orchestrating session) | Light skim per task; the full review runs once per branch. |

**Opus reviews Sonnet's work — is that right?** Yes, with two refinements built in:
1. *Per branch, not per task.* Deterministic gates (after-edit checks, Stop-gate verify,
   guard) catch per-task mechanical problems for free; the orchestrating Opus session skims
   each task's diff; one full Opus review covers the branch. Per-task full reviews would cost
   ~3-5× more for little extra catch.
2. *Tools first.* Static analyzers run before the reviewer and their results are passed in,
   so Opus spends tokens on logic, not on what a linter would say.
Opus reviewing Sonnet-written code is also a different, stronger model checking the work,
which catches more than a model reviewing its own output.

## Where routing happens

| Mechanism | How |
|---|---|
| Agents | `model:` pinned in each `agents/*.md` |
| Per-dispatch override | `/n-build` passes `model: haiku` to `n-implementer` for `model:haiku` tasks |
| Skills | `model:` in frontmatter applies for the turn (`/n-ideate`, `/n-plan`, `/n-architect`, `/n-design`, `/n-secure`, `/n-retro`, `/n-forge` = opus; `/n-init`, `/n-docs`, `/n-ship` = sonnet) |
| Task graph | Every issue carries a `model:*` label chosen by `/n-plan` |

Main session: **Opus** (it orchestrates and reasons). On a cheaper main session, skills use
`n-planner` (Opus) for the judgment steps.

## Escalation

- 3 failed verify attempts at a tier → next tier up, with the Haiku log summaries attached.
- Implementer reports the brief is ambiguous → Opus fixes the *brief*, not the code.
- Never de-escalate mid-task.

## Where the tokens actually go (and the fixes)

| Cost | Fix in n-stack |
|---|---|
| Main session reading raw logs / big files | Haiku summaries; code map; `LSP` lookups instead of reading files |
| Subagent cold start (each re-reads CLAUDE.md + files) | Delegate only tasks big enough to amortize it; small edits are done inline; briefs give exact paths |
| Re-discovering project state each session | SessionStart hook prints it (zero tokens to compute) |
| Verifying by reading | Commands verify; the model reads only failures |
| Review re-finding lint issues | Static tools run first; reviewer told not to repeat them |
| Long sessions dragging old context | Stop after ~6 tasks; state lives in GitHub + git |
| Skill text loaded every run | Short SKILL.md; detail in `references/` loaded on demand |

Measure it: `nstack-retro --cost` (ccusage) and the event counts in `/n-retro`.
