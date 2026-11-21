# Engineering standards

The bar for every line n-stack writes. Named principles in brackets — look them up when
you want the depth.

## Design
- **Single responsibility** per module/function. If you need "and" to describe it, split it. [SRP]
- **Pure core, imperative shell.** Business rules are pure functions; I/O (DB, HTTP, time,
  randomness) lives at the edges and is passed in. Pure code is trivially testable. [Functional core / imperative shell]
- **Dependency direction inward.** UI → application → domain. Domain imports nothing from
  frameworks. [Clean / hexagonal architecture, Dependency Inversion]
- **Composition over inheritance.** Small functions and objects combined, not deep class trees.
- **Duplicate twice, abstract on the third time** — and only when the cases really are the
  same concept. Wrong abstraction is costlier than duplication. [Rule of three, AHA]
- **YAGNI.** No speculative options, plugin systems or config for needs nobody has.
- **Make illegal states unrepresentable.** Discriminated unions / enums over boolean flags
  and nullable soup.

## Code
- Names say what, in the domain's words: `overdueInvoices`, not `data2`. Functions are verbs,
  booleans read as questions (`isExpired`).
- Functions short enough to see at once (~40 lines); early returns over nesting.
- No magic numbers or strings — named constants.
- Comments explain **why** (a constraint, a gotcha, a link to an ADR), never what.
- Match the repo's existing style even where you'd prefer another.

## Errors
- **Validate at boundaries** (API input, env vars, file contents, third-party responses)
  with a schema; trust data inside. [Parse, don't validate]
- **Never swallow errors.** No empty `catch`; catch only to add context, recover, or translate.
- Error messages: what failed, the relevant value/id, and what to do.
- Fail fast on startup for missing configuration.
- Distinguish expected failures (validation, not found → return a result/4xx) from bugs
  (throw → 5xx + error tracking).

## Security
- Never log secrets, tokens or PII. Never commit them.
- Parameterized queries only; no string-built SQL/shell commands.
- Authorization on every resource access, server-side, by owner/tenant — not just "is logged in".
- Escape output by default (framework auto-escaping); no `dangerouslySetInnerHTML` / `eval`.
- Dependencies: well-maintained, pinned by lockfile; don't add one for a 10-line function.

## Data and concurrency
- Multi-step writes in a transaction. Check-then-act → use unique constraints or locks.
- Operations triggered by users or webhooks are idempotent (safe to retry / double-click).
- No N+1 queries: batch or join. Paginate every list.
- Timeouts on every network call.

## Tests
- Test **behaviour**, through the public interface, not implementation details.
- Each test would fail if the feature broke. A test that can't fail is noise.
- Bug fix → write the failing test first, then fix. [Regression test]
- Arrange-Act-Assert; one behaviour per test; descriptive names
  (`returns null when session expired`).
- Deterministic: fake time, no real network, no order dependence.
- Pyramid: many unit, some integration (real DB in a container if possible), few E2E for
  critical flows.

## Git
- One task, one commit; conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`,
  `chore:`), with the task id.
- Never commit generated artifacts, secrets, or commented-out code.
