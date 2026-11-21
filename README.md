# n-stack

A personal software-development system for Claude Code, packaged as a plugin. It turns one
builder into a disciplined team — YC partner, PM, architect, designer, engineers, staff
reviewer, QA, security, release engineer — routes each job to the cheapest model that does
it reliably, and **enforces** quality with hooks and scripts instead of hoping the model
remembers.

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
| Parallel agent worktrees | Based on your current branch, outside the repo, `node_modules` linked |
| `git commit` / `git push` | No `.env` commits; gitleaks; verify before push |
| Pull request | CI: verify, e2e, gitleaks, ship gate (make them required checks) |

Bundled MCP servers: **Playwright** (browser QA) and **Context7** (current library docs,
loaded only when a tool is actually called). Optional, added per user: Sentry, Figma.

## Install

Requirements: Claude Code, Git (+ Git Bash on Windows), Node.js 18+, `gh` (logged in),
[gitleaks](https://github.com/gitleaks/gitleaks) (`winget install gitleaks` / `brew install gitleaks`).

In Claude Code:

```
/plugin marketplace add C:\Users\<you>\n-stack
/plugin install n-stack@n-stack
```

Restart Claude Code. Then in a project: `/n-init`, and `/nstack` whenever you're unsure.

The marketplace points at this folder, so the plugin runs **in place**: edit a skill here,
restart (or `/reload-plugins`), and the change is live. No copying, no reinstall.

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

## Docs

- [ETHOS.md](ETHOS.md) — principles and the five engineering disciplines
- [docs/model-routing.md](docs/model-routing.md) — who does what, and why
- [docs/artifact-graph.md](docs/artifact-graph.md) — stage inputs and outputs
- [docs/evidence-loop.md](docs/evidence-loop.md) — how n-stack improves itself
- [docs/n-kit-spec.md](docs/n-kit-spec.md) — the planned lightweight edition
