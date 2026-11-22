# n-stack

[![tests](https://github.com/nityameh/n-stack/actions/workflows/test.yml/badge.svg)](https://github.com/nityameh/n-stack/actions/workflows/test.yml)

**AI coding assistants forget rules. n-stack makes the rules code.**

When you tell an AI agent "never read `.env`" or "don't skip failing tests", that is a
suggestion in a prompt, and long sessions erode it. n-stack is a
[Claude Code](https://claude.com/claude-code) plugin that turns those rules into hooks and
scripts that run on every tool call, so the agent *cannot* break them. It also gives the
agent a structured workflow (idea → plan → build → review → ship), with each job routed to
the cheapest model that does it reliably.

Here is the guard hook blocking three real violations. Each is a hook exiting with code 2,
and Claude Code feeds the message back to the model so it can correct itself:

```text
$ echo '{"tool_name":"Read","tool_input":{"file_path":".env"}, ...}' | node hooks/guard.mjs
n-stack guard (secret-file): .env holds secrets and is off limits to agents. Use .env.example
for variable names; ask the user to set values.                                    # exit 2

n-stack guard (test-skip): this edit adds 1 skipped/focused/todo test marker(s) to
src/money.test.ts. Fix the code or the test instead. If skipping is truly intended, ask the
user to create .n-stack/allow-weaken.                                              # exit 2

n-stack guard (read-only-agent): n-scout is a read-only agent; it may not use Edit.
Report findings instead.                                                           # exit 2
```

Inspired by [gstack](https://github.com/garrytan/gstack). Different priorities:

1. **Enforced, not suggested.** Secrets, test integrity, read-only agents, "don't finish on
   red" and the ship gate are code (hooks, git hooks, a CI job), not prose.
2. **Right model for the job.** Haiku reads, Sonnet implements and documents, Opus plans,
   diagnoses and reviews.
3. **AI-first projects.** One verify command, a generated code map, docs that know when
   they're stale, tasks as GitHub issues any agent can query.
4. **Lean context.** Short skills, references loaded on demand, deterministic work in
   scripts (zero tokens), subagents that return summaries.
5. **Learning built in.** Every task can leave a learning entry: why, concepts, principles,
   steps, edge cases, self-check questions. Tasks tagged `me` are yours to build, with review.
6. **Evidence loop.** Hooks and skills log what happens; `/n-retro` turns it into changes.

---

## Lifecycle

```
/n-init ─▶ /n-ideate ─▶ /n-plan ─┬▶ /n-architect ─┐
                                 └▶ /n-design ────┴▶ /n-build ─▶ /n-review ─▶ /n-test ─▶ (/n-secure) ─▶ /n-docs ─▶ /n-ship ─▶ /n-retro
                                                      ▲    │          │                                           │
                                                      └── /n-debug ◀──┴───────────────────────────────────────────┘
```

Stages hand off through **files and GitHub issues**, never chat history, so any session can
resume anywhere. Not sure where you are? `/nstack`.

| Command | Model | What it does | Writes |
|---|---|---|---|
| `/nstack` | session | Reads project state, names the next step | — |
| `/n-init` | sonnet | Project kit, verify command, git hooks, CI, CLAUDE.md, LSP | `.n-stack/`, `.githooks/`, `CLAUDE.md` |
| `/n-ideate` | opus | YC office hours: stage-routed forcing questions, premises, approaches, verdict + assignment | `docs/product/idea.md` |
| `/n-plan` | opus | PRD with testable criteria → task graph as GitHub issues with a model per task | `prd.md`, issues |
| `/n-architect` | opus | System design, contracts, diagrams, failure modes, ADRs | `docs/architecture/` |
| `/n-design` | opus | Visual brainstorm: 3-4 clickable options on a board → chosen spec | `docs/design/` |
| `/n-build` | opus → sonnet/haiku | Runs ready issues: briefs, test-first, worktrees, bounded verify loop, commits, learning entries | code, `docs/learning/` |
| `/n-debug` | haiku reads → opus reasons | Reproduce, hypotheses, fix, regression test, escaped-defect evidence | fix + test |
| `/n-review` | static tools → opus | Analyzers first, then Opus staff review; record gates shipping | `docs/reviews/` |
| `/n-test` | sonnet testers | Regression, mutation, Playwright-MCP QA, e2e | tests, `docs/qa/` |
| `/n-secure` | opus (optional) | STRIDE + scanners + OWASP review with exploit scenarios | `docs/security/` |
| `/n-docs` | sonnet | Sync stale docs to the code, re-stamp, commit (git = versions) | docs |
| `/n-ship` | sonnet | Gate script, PR, CI loop, merge/deploy on confirmation | PR, `CHANGELOG.md` |
| `/n-retro` | opus | Evidence → max 3 improvements, routed to `/n-forge` | `docs/retro/` |
| `/n-forge` | opus | Create/improve skills, agents, hooks, prompts | plugin files |

Agents (namespaced `n-stack:<name>`): `n-scout` (haiku, read-only) · `n-log-triager` (haiku,
read-only, reports facts, no diagnosis) · `n-implementer` (sonnet/haiku) · `n-test-writer`
(sonnet, test files only) · `n-staff-reviewer` (opus, read-only) · `n-qa-tester` (sonnet,
scratch-only writes) · `n-planner` (opus, read-only).

## What runs automatically (zero tokens)

| When | What |
|---|---|
| Session start | Branch, uncommitted files, last verify, stale docs, in-progress tasks; code map refreshed |
| Before each tool call | Guard: no secrets; no skipped tests / removed assertions / new suppressions; read-only agents stay read-only; frozen tests stay frozen |
| After each edit | Formatter + fast per-file check; failures go straight back to Claude |
| Before Claude finishes | Verify must be green on the changed code (cached; doc-only skips) |
| `git commit` / `git push` | No `.env` commits; gitleaks; verify before push |
| Pull request | CI: verify, e2e, gitleaks, ship gate (make them required checks) |

## Token budget

Built in, not left to discipline (details in [docs/model-routing.md](docs/model-routing.md)):

- `testFirst: auto` — only tasks labeled `tdd` (logic-heavy) get a separate test-writer run.
- `sessionTaskBudget: 3` — `/n-build` stops after 3 tasks and says `/clear`.
- `nstack-diff` — per-task check opens only the risky files; verify covers the rest.
- Reviews never run inside build sessions: `/n-review` once per milestone, in a fresh session.
- `learning: true` stays on by default (it is the point); set it `false` for throwaway projects.

Bundled MCP servers: **Playwright** (browser QA) and **Context7** (current library docs,
loaded only when a tool is actually called). Optional, added per user: Sentry, Figma.

## Install

Requirements: Claude Code, Git (+ Git Bash on Windows), Node.js 18+, `gh` (logged in),
[gitleaks](https://github.com/gitleaks/gitleaks) (`winget install gitleaks` / `brew install gitleaks`).

Start Claude Code **from a terminal** in the project, pointing it at the plugin folder:

```bash
git clone https://github.com/nityameh/n-stack ~/n-stack
cd ~/projects/<project>
claude --plugin-dir ~/n-stack/plugins/n-stack
```

That loads n-stack for this session only (selective by design), straight from this folder,
so edits to n-stack are live in the next session: no cache, no version bump. Then
`/n-init`, and `/nstack` whenever you're unsure.

**Why not `/plugin install`?** As of Claude Code 2.1.327, a plugin installed from a *local
folder* marketplace is registered and shown as enabled but never loaded (no skills, agents
or hooks), in both the CLI and the VS Code extension. Check with
`claude -p "ok" --debug-file d.txt` and look for `Loaded 15 skills from plugin n-stack`.
When that works, install with `/plugin marketplace add <path>` and
`/plugin install n-stack@n-stack --scope project`.

## Editing and extending

- Change a skill: edit `plugins/n-stack/skills/<name>/SKILL.md` (or its `references/`), or run
  `/n-forge <what's wrong>` with an example. Commit in this repo; bump `version` in
  `plugins/n-stack/.claude-plugin/plugin.json` for notable changes.
- Test the harness: `node --test plugins/n-stack/test/harness.test.mjs` (guard, stop gate,
  ship gate incl. rebase, docs drift, code map — in throwaway repos).
- Validate: `claude plugin validate ./plugins/n-stack`.
- Test a hook: pipe sample JSON to it, e.g.
  `echo '{"cwd":"<repo>","tool_name":"Read","tool_input":{"file_path":".env"}}' | node plugins/n-stack/hooks/guard.mjs; echo $?`
- Evidence for what to change: `/n-retro` ([docs/evidence-loop.md](docs/evidence-loop.md)).

## Design decisions

- **Hooks, not prompts, for anything that must always hold.** A prompt is probabilistic; a hook
  is a process with an exit code. Prose is for judgment calls, scripts are for rules.
- **Fail safe, never crash.** Hooks wrap risky work in try/catch, stay quiet on success, and
  do nothing outside projects that opted in via `.n-stack/config.json`.
- **Every loop has a budget and an exit to the human.** Verify-and-fix loops are bounded; the
  stop gate blocks a bounded number of times, then hands control back instead of spinning.
- **Dependency-free Node.** Hooks and CLIs use only the standard library, so there is nothing
  to install and nothing to supply-chain.
- **Tested like production code.** Each test builds a throwaway git repo and drives the real
  hooks and gate, including edge cases such as review coverage surviving a rebase. Every bug
  fixed in a hook gets a test first.
- **Stages hand off through files and issues, not chat history,** so any session can resume.

## Known limitations

- Developed and tested mainly on Windows; CI runs on Linux. Commands in `config.json` run
  through the platform shell, so keep them simple.
- The test suite covers the deterministic parts (hooks, gate, docs drift, code map). The
  skill and agent prompts are not automatically tested. `/n-retro` is meant to supply that
  evidence over time.
- Cost figures in [docs/model-routing.md](docs/model-routing.md) and
  [docs/n-kit-spec.md](docs/n-kit-spec.md) are design estimates, not measurements.
- n-kit, the lightweight edition in the spec, is **not built yet**.
- `/plugin install` from a local marketplace is currently broken in Claude Code (see Install).

## Docs

- [ETHOS.md](ETHOS.md) — principles and the five engineering disciplines
- [docs/model-routing.md](docs/model-routing.md) — who does what, and why
- [docs/artifact-graph.md](docs/artifact-graph.md) — stage inputs and outputs
- [docs/evidence-loop.md](docs/evidence-loop.md) — how n-stack improves itself
- [docs/n-kit-spec.md](docs/n-kit-spec.md) — the planned lightweight edition
