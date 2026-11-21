# n-kit — the lightweight edition (spec, to build after n-stack v2 is proven)

n-kit is for small projects, prototypes, hackathons and days when the full lifecycle is
overkill. Same guardrails, a fraction of the ceremony and tokens. It ships as a second plugin
in this marketplace (`n-kit@n-stack`); enable one or the other per project.

## Principles

- **One session does the work.** No subagent fan-out except Haiku log reading. Subagents
  cost a cold start each; on small work, inline is cheaper.
- **Keep every free guardrail.** The hooks cost zero tokens, so n-kit keeps them all:
  guard (secrets, test weakening), after-edit check, Stop-gate verify, git hooks, gitleaks.
- **One file of state.** `PLAN.md` (checklist), not GitHub issues, milestones and labels.
- **Sonnet by default, Opus only where judgment pays:** planning and the one review.

## Commands (5)

| Command | Model | Does |
|---|---|---|
| `/k-plan` | opus | 3 YC questions (who, status quo, smallest version) + 3-7 step checklist with acceptance criteria → `PLAN.md`. Optional: one quick HTML sketch with 2 options. |
| `/k-build` | sonnet (session) | Works the checklist top to bottom in the main session; test-first optional; commits per step; Haiku reads long failure logs. |
| `/k-fix` | sonnet, opus on 2nd failed hypothesis | Reproduce → failing test → fix. |
| `/k-check` | opus | Static tools + one Opus review pass + run tests + a quick Playwright smoke if web. Writes a 10-line note in `PLAN.md`. |
| `/k-ship` | sonnet | Gate-lite (verify, gitleaks, review note exists) → PR → CI watch. |

## Kept from n-stack

Hooks (all), `.githooks`, gitleaks, `.n-stack/config.json` (same format), code map,
`n-log-triager`, the review checklist, engineering standards, learning entries (off by default).

## Dropped

GitHub-issue task graph, milestones, worktrees, test-writer agent, architecture/ADR stage,
design boards (beyond a 2-option sketch), docs drift tracking, security stage, mutation
testing, retro (events still logged, so `/n-retro` from n-stack can still read them).

## Upgrade path

`/n-init` on an n-kit project converts `PLAN.md` into issues and turns on the full lifecycle;
nothing else changes because config, hooks and records share one format.

## Target budget

A small feature (≤ 5 files) end to end in roughly a third of n-stack's tokens: one planning
pass, one implementation session, one review.
