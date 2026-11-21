# n-stack ethos

## Principles

**1. Correct before fast.** Speed comes from not redoing work. Every stage ends with a
check that can fail: a verdict, an acceptance criterion, a verify command, a review gate.
"It looks done" is not a check.

**2. Files are the memory.** Chat scrolls away; files stay. Decisions, plans, designs and
findings live in the project's `docs/` at fixed paths, so any session or agent can resume
from them. If it matters tomorrow, it goes in a file today.

**3. Context is a budget.** Every token loaded is a token paid for and a token competing
for attention. Load the least that lets the model do the job well: paths instead of file
contents, summaries from subagents instead of raw output, references loaded on demand.

**4. Cheapest model that is reliably right.** Haiku reads (logs, search) and does
mechanical edits, but never diagnoses. Sonnet implements well-specified work. Opus plans,
diagnoses root causes and reviews. Escalate when a cheaper model fails; never let a cheap
model's wrong answer cost a redo by an expensive one. See [docs/model-routing.md](docs/model-routing.md).

**4b. Enforce in code what matters; write in prose what needs judgment.** A rule an agent
can talk itself out of is a suggestion. Secrets, test integrity, "don't finish on red" and
the ship gate are hooks and scripts.

**5. Complete, not big.** Cover every acceptance criterion, error path and edge case the
task actually has. Write nothing beyond that: no speculative abstractions, no handling for
states that cannot happen. Complete coverage, minimal code.

**6. Boring technology, sharp product.** Use well-known tools so agents and future-you
already know them. Spend novelty on the product, not the stack.

**7. The human decides taste and risk.** Agents propose with a recommendation; you choose
on product direction, design taste, irreversible actions (merge, deploy, delete, spend).

---

## The five engineering disciplines

These are the levers that make AI-assisted development accurate. Each one is a concrete
mechanism in n-stack, not a slogan.

### 1. Prompt engineering — *saying exactly what you want*

Writing instructions a model follows reliably.

- **Where in n-stack:** every `SKILL.md` and agent file. `/n-forge` is the skill for writing
  more of them.
- **Rules we apply:** state the goal and the definition of done; give steps as a numbered
  workflow; say what *not* to do only where the model's default is wrong; specify the
  output format; give one good example rather than five rules; put the trigger ("use when…")
  in the description, because that is what decides whether a skill loads at all.

### 2. Context engineering — *giving the model the right information, and only that*

Deciding what goes into the context window, when, and in what shape.

- **Where in n-stack:**
  - Project `CLAUDE.md` (≤ ~100 lines): purpose, commands, layout map, conventions — the
    first thing every agent reads (`/n-init`).
  - Artifact files at fixed paths (`docs/product/`, `docs/architecture/`, `docs/design/`) and
    tasks as GitHub issues, so skills read *decisions*, not chat history.
  - A generated **code map** (`.n-stack/tmp/codemap.md`: files, exports, import counts) and
    `LSP` symbol lookups, so agents find code without reading it.
  - The SessionStart hook hands each session the project state in a few lines.
  - Docs that know when they're stale (`nstack-doc` markers), so agents don't trust old text.
  - Progressive disclosure: skills point at `references/*.md` and load them only at the step
    that needs them.
  - Task briefs (`/n-build`): goal, acceptance, files to touch, files to read, verify command,
    out of scope — paths, never pasted file contents.
  - Subagents return compressed results (`n-scout` returns a file map, `n-log-triager`
    returns the facts a log states), so the expensive main context never holds raw dumps.

### 3. Harness engineering — *shaping the environment the agent runs in*

The tools, permissions, hooks and commands around the model. A good harness makes the
right action easy and the wrong action impossible.

- **Where in n-stack:**
  - One deterministic **verify command** per project (`.n-stack/config.json`). Every loop
    ends on it, and the **Stop hook** won't let Claude finish while it's red.
  - **Guard hook** before every tool call: secrets off limits, no skipped tests, removed
    assertions or new suppressions, read-only agents stay read-only, frozen tests stay frozen.
  - **After-edit hook**: format + per-file check, failures fed back immediately.
  - **Git hooks** (gitleaks, verify before push) and a **CI gate** — they run even when you
    commit by hand, and a required CI check can't be talked past.
  - Subagents with **restricted tools**: reviewers, scouts and log readers have no
    Edit/Write/Bash at all.
  - `disable-model-invocation` on `/n-ship`: pushing and deploying only happen when *you*
    type the command.

### 4. Loop engineering — *iterate until verified, with limits*

Agents are most accurate inside a feedback loop with a real signal: act → check → fix.

- **Where in n-stack:**
  - **Edit loop** (hooks): every edit → per-file check → fix while the context is fresh.
  - **Build loop** (`/n-build`): implement → verify → on red, Haiku reads the log, Opus
    diagnoses → fix → re-verify. Max 3 attempts, then escalate the model, then you.
  - **Debug loop** (`/n-debug`): reproduce with a failing test → hypothesis → smallest
    change → re-run. One variable at a time.
  - **CI loop** (`/n-ship`): watch checks → triage failure → fix → push.
  - **Design loop** (`/n-design`): variants → your pick/feedback → refined variant.
  - **Learning loop**: non-obvious lessons go to `docs/learnings.md`; repeated ones get
    promoted into skills via `/n-forge`.
  - **Evidence loop** (`/n-retro`): hooks and skills log events → retro finds patterns →
    ≤ 3 changes via `/n-forge` → next retro checks they worked ([docs/evidence-loop.md](docs/evidence-loop.md)).
- **Every loop has a budget** (attempts or time) and an exit that hands control back to you.
  An unbounded loop is a bug.

### 5. Graph engineering — *structuring work as a dependency graph*

Representing work as nodes with explicit inputs, outputs and dependencies, so the system
knows what can run, what can run in parallel, and what is blocked.

- **Where in n-stack:**
  - The **lifecycle graph**: skills are nodes, artifacts are edges
    ([docs/artifact-graph.md](docs/artifact-graph.md)). `/nstack` walks it to find the next step.
  - The **task graph** as GitHub issues: each has dependencies, files, a model label,
    acceptance criteria and a verify command. `nstack-tasks` computes what's ready and
    checks for cycles; `/n-build` runs ready tasks, in parallel worktrees when their files
    don't overlap.
  - The **review fan-out**: big diffs split by area into parallel reviewers, results merged.
