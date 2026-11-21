# `.n-stack/config.json` reference

Committed to the repo. Hooks and the ship gate read it; skills read it for preferences.
Commands run through the platform shell (cmd.exe on Windows, sh elsewhere): keep them to
simple `npm run x`, `npx tool args`, `python -m x` forms.

| Field | Used by | Meaning | Example |
|---|---|---|---|
| `verify` | Stop hook, pre-push, gate, /n-build | The one "is it correct?" command | `npm run check` |
| `verifyTimeoutSec` | Stop hook | Max seconds for verify | `600` |
| `stopVerify` | Stop hook | `false` turns the Stop gate off | `true` |
| `format` | after-edit hook | ext list → formatter; `{file}` = edited file | `{".ts,.tsx": "npx prettier --write {file}"}` |
| `fileChecks` | after-edit hook | ext list → fast per-file check | `{".ts,.tsx": "npx eslint --max-warnings=0 {file}", ".py": "ruff check {file}"}` |
| `fileCheckTimeoutSec` | after-edit hook | Max seconds per check | `60` |
| `static` | /n-review | Whole-repo analyzers run before the LLM review | see below |
| `mutation` | /n-test | Mutation command; `{files}` = changed source files | `npx stryker run --mutate {files}` |
| `tasks` | everything | `github` (issues) | `github` |
| `testFirst` | /n-build | `always` · `never` · `ask` (per batch) | `ask` |
| `learning` | /n-build | Write a learning entry per task | `true` |
| `requireQa` | gate | Require a QA record to ship | `true` |
| `security` | /nstack, /n-ship | `always` · `never` · `ask` for /n-secure | `ask` |
| `migrationPaths` | gate, /n-review | Regex for migration files | default covers common ORMs |

## `static` suggestions (pick what fits; each must exit non-zero on findings)

| Tool | Finds | Command |
|---|---|---|
| Semgrep | security and bug patterns | `semgrep scan --config p/default --error --quiet` |
| knip (JS/TS) | unused files, exports, deps | `npx knip` |
| jscpd | copy-paste duplication | `npx jscpd src --threshold 3 --silent` |
| dependency-cruiser (JS/TS) | architecture rule violations (e.g. domain imports UI) | `npx depcruise src --config` |
| tsc | whole-project types | `npx tsc --noEmit` |
| ruff / mypy (Python) | lint / types | `ruff check .` · `mypy .` |
| osv-scanner | vulnerable dependencies | `osv-scanner scan source -r .` |

Keep `fileChecks` fast (one file); keep slow whole-repo tools in `static`.
