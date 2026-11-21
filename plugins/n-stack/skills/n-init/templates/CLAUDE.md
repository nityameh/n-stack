# <Project name>

<One or two sentences: what this is, who it is for.>

## Commands

| Purpose | Command |
|---|---|
| Install | `...` |
| Dev server | `...` (port ...) |
| **Verify (must pass before finishing any task)** | `...` |
| One test file | `...` |
| E2E / browser tests | `...` |
| Build | `...` |

## Stack

<Language, framework, database, key libraries — one line each.>

## Finding things

- **Code map:** `.n-stack/tmp/codemap.md` — every source file with its exports and import
  counts, regenerated each session. Read it before searching.
- Product: `docs/product/prd.md` · Architecture: `docs/architecture/overview.md` ·
  Decisions: `docs/architecture/adr/` · Design: `docs/design/decisions.md`
- Tasks: GitHub issues labelled `n-task` (`nstack-tasks ready`)
- Lessons learned: `docs/learnings.md`

## Conventions

- <Naming: files, functions, components>
- <Where tests live and how they are named>
- <Error handling pattern>
- <Data access pattern>
- <Anything an agent would get wrong by default here>

## Do not

- <e.g. edit generated files in src/gen/>
- <e.g. call the payments API from the client>
