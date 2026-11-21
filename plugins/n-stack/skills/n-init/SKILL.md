---
name: n-init
description: "Set up a repo as an n-stack project: verify command, hooks, git hooks, CI, CLAUDE.md, docs skeleton. Use for \"init\", \"set up this repo\", \"n-init\"."
disable-model-invocation: true
model: sonnet
---

# /n-init — make this repo an n-stack project

Goal: any agent opening this repo learns what it is, how to verify a change, and where
things live in under 2 minutes — and the quality gates run without anyone remembering them.

## 1. Detect

Dispatch `n-stack:n-scout`: "Identify language(s), framework(s), package manager, test
framework, linter, formatter, type checker, build tool, dev server command and port, deploy
target, CI config, and top-level folder purposes."

**Empty repo?** Ask what they are building and in which stack, recommending a boring default
(web: TypeScript + Next.js + Postgres + Vitest + Playwright; API: Python + FastAPI + pytest).
Scaffold with the official generator, `git init`, first commit, then continue.

## 2. Install the project kit

```bash
nstack-project init
```
It writes `.n-stack/config.json`, `.n-stack/bin/{gate,docs}.mjs`, `.githooks/pre-commit`
(blocks `.env` commits, gitleaks scan) and `.githooks/pre-push` (gitleaks + verify), sets
`core.hooksPath`, and ignores `.n-stack/tmp/`. If it warns that gitleaks is missing, give the
install command (`winget install gitleaks` / `brew install gitleaks`) and wait for the user.

## 3. Fill `.n-stack/config.json` (show the user, then write)

Read `${CLAUDE_SKILL_DIR}/references/config.md` for every field. The essentials:
- `verify` — **one** command: typecheck + lint + unit tests, non-interactive, < ~2 min. If it
  doesn't exist, add a script (`"check"` in package.json, a `make check` target) after the
  user agrees. Run it once; it must pass before n-stack can work (the Stop hook enforces it).
- `fileChecks` / `format` — fast per-file commands for the after-edit hook (≤ ~5 s each).
- `static` — whole-repo analyzers for `/n-review` (Semgrep, knip, jscpd, dependency-cruiser…),
  only tools that are installed or one `npx` away.
- `mutation` — e.g. Stryker / mutmut, if the user wants mutation testing.
- `learning`, `testFirst`, `requireQa`, `security` — ask once, with recommendations.

## 4. GitHub (task issues need it)

`gh auth status`; if the repo has no GitHub remote, offer `gh repo create <name> --private
--source . --push`. Then `nstack-project ci` to add `.github/workflows/n-stack-ci.yml`
(verify, e2e, gitleaks, ship gate); adapt its toolchain steps to this stack. Offer the
optional `--claude-review` workflow (explain it uses their subscription via
`CLAUDE_CODE_OAUTH_TOKEN`). Recommend branch protection with `verify`, `secrets` and `gate`
as required checks.

## 5. Code intelligence (symbol-aware navigation)

Recommend the official LSP plugin for the main language, e.g. TypeScript:
`npm install -g typescript-language-server typescript` then
`/plugin install typescript-lsp@claude-plugins-official` (Python: `pyright-lsp`, Go:
`gopls-lsp`, Rust: `rust-analyzer-lsp`). It gives type errors after every edit and an `LSP`
tool for go-to-definition / find-references, which n-stack agents use.

## 6. CLAUDE.md and docs skeleton

Write `CLAUDE.md` from `${CLAUDE_SKILL_DIR}/templates/CLAUDE.md` (≤ ~100 lines; it loads in
every session). Existing `CLAUDE.md`: **merge**, show the changes, apply on approval.
Create `docs/product/ docs/architecture/adr/ docs/design/ docs/reviews/ docs/qa/ docs/learning/`
and `docs/learnings.md` from `${CLAUDE_SKILL_DIR}/templates/learnings.md`.
Run `nstack-codemap` once.

## 7. Harness and AI-readiness

Propose `.claude/settings.json` permissions per `${CLAUDE_SKILL_DIR}/references/harness.md`.
Read `${CLAUDE_SKILL_DIR}/references/ai-first-conventions.md`; don't refactor now — record
the top 3-5 gaps under "AI-readiness gaps" in `docs/learnings.md`.

Commit: `chore: adopt n-stack` (hooks will scan it).

## 8. Pending plan

If `docs/product/plan.json` exists and the repo has no `n-task` issues yet (planned before
GitHub was connected): `nstack-tasks create docs/product/plan.json --dry-run`, show it,
create on approval, then `nstack-tasks check`.

## Report

```
STACK: ...
VERIFY: <command> → pass
HOOKS: pre-commit (secrets) · pre-push (secrets + verify) · Claude hooks active
GITHUB: <repo> · CI: <added / skipped> · LSP: <installed / recommended>
GAPS: <top AI-readiness gaps>
NEXT: /n-ideate (new idea) · /n-plan (known feature)
```
