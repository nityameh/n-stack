# AI-first codebase conventions

Code that is easy for an agent to work on is code that is easy for a new teammate to work
on — just more so. An agent sees the repo through search and partial file reads, has no
memory between sessions, and believes what the code and docs tell it.

## Findable

- **Grep-able names.** Unique, descriptive identifiers (`createInvoiceDraft`, not `handle`).
  Avoid dynamic dispatch by string, metaprogramming and magic registration that search
  cannot follow.
- **Feature folders.** Group by feature (`billing/`, `auth/`) rather than by type
  (`controllers/`, `models/`) once a project has more than a handful of features.
- **One concept per file; files under ~400 lines.** Agents read files in chunks; huge files
  get partially read and misunderstood.
- **Colocated tests** (`invoice.ts` + `invoice.test.ts`) so the agent finds and updates them.

## Explicit

- **Types at every boundary** (API handlers, DB access, public functions). Schemas with
  runtime validation (Zod, Pydantic) at the edge of the system.
- **No hidden globals or ambient state.** Pass dependencies in.
- **Errors say what, why and how to fix:** `"STRIPE_KEY missing: set it in .env (see
  .env.example)"`, not `"config error"`.
- **Comments explain why, not what.** The what is the code.

## Verifiable

- **One verify command** (typecheck + lint + tests) that runs in < ~2 minutes and exits
  non-zero on any problem.
- **Deterministic tests.** No real network, no real time, no order dependence. Flaky tests
  poison every agent loop.
- **Structured logs** with a request/operation id, so a failure can be traced from one line.

## Documented where agents look

- Root `CLAUDE.md` (short), nested `CLAUDE.md` for big areas.
- Decisions in ADRs with numbers (`adr/0004-use-postgres-queues.md`) so they can be cited.
- Task and requirement ids (`T-012`, `US-3`) referenced in commits and tests.
- `.env.example` listing every variable with a comment.

## Predictable

- One way to do each common thing (one HTTP client, one data-access pattern, one form
  library). When there are two, write down which is current in `CLAUDE.md`.
- Pure core, imperative shell: business logic in pure functions; I/O at the edges.
- Dependency direction points inward: UI → application → domain; domain imports nothing
  from UI or infrastructure.
