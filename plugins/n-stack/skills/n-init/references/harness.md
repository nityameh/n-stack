# Harness for an n-stack project

The harness is everything around the model. n-stack ships most of it as plugin hooks
(active in any repo with `.n-stack/config.json`) and git hooks (active for every commit,
including ones you make by hand).

## What already runs, with zero tokens

| When | What | Where |
|---|---|---|
| Session start | Branch, uncommitted count, last verify, stale docs, in-progress tasks; code map refresh | plugin `SessionStart` |
| Before every Read/Edit/Write/Bash | Secrets off limits; no skipped tests, removed assertions or new suppressions; read-only agents stay read-only; frozen tests stay frozen | plugin `PreToolUse` guard |
| After every Edit/Write | Format + per-file check; failures shown to Claude immediately | plugin `PostToolUse` |
| Before Claude ends a turn | Verify must be green on changed code (cached; doc-only changes skip) | plugin `Stop` |
| `git commit` | Refuse `.env`; gitleaks on staged changes | `.githooks/pre-commit` |
| `git push` | gitleaks on pushed commits; verify | `.githooks/pre-push` |
| Pull request | verify, e2e, gitleaks, ship gate | `.github/workflows/n-stack-ci.yml` |

Human override for the guard's test/suppression rules: the **user** creates
`.n-stack/allow-weaken` (valid 60 minutes). Agents are blocked from creating it.

## Permissions — `.claude/settings.json` (project, committed)

Pre-allow what loops run constantly so they don't stall; never pre-allow push or deploy.

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run check)", "Bash(npm run test:*)", "Bash(npx playwright test:*)",
      "Bash(nstack-tasks:*)", "Bash(nstack-codemap)", "Bash(nstack-docs:*)", "Bash(nstack-gate:*)",
      "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)"
    ],
    "deny": ["Read(./.env)", "Read(./.env.*)", "Read(**/*.pem)"]
  }
}
```

Keep personal entries in `.claude/settings.local.json` (gitignored).

## Commands as an API for agents

- Non-interactive by default; `test` and `test:watch` separate.
- Non-zero exit and a clear first error line on failure.
- Accept a path/filter so one test file can run alone.
