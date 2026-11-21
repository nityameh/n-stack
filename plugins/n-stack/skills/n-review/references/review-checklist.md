# Staff review checklist

Only report what you can tie to a concrete failure. Skip anything a linter/formatter catches.

## Correctness
- Does the code do what the task's acceptance criteria say — all of them?
- Off-by-one, inverted conditions, wrong operator, unhandled `null`/`undefined`/empty.
- Boundary inputs: 0, 1, many, max, negative, unicode, very long strings, duplicates.
- Time: time zones, DST, "now" captured once vs many times, date-only vs datetime.
- Money / numbers: floating point for currency, rounding, overflow, unit mismatch.
- Async: missing `await`, unhandled promise rejection, forgotten return, ordering assumptions.

## State and concurrency
- Check-then-act without a transaction or unique constraint (double create, overselling).
- Two requests / tabs / retries at once — what happens?
- Shared mutable state, caches without invalidation, module-level singletons holding request data.
- Retries on non-idempotent operations.

## Data
- Migrations: reversible? Safe on a large table (locks, backfill)? Compatible with the
  previous app version during deploy?
- New queries: indexed? N+1? Unbounded result sets?
- Data integrity: constraints in the DB, not only in app code.

## Security
- Authorization on every new endpoint/resource, checked against the owner/tenant.
- Untrusted input reaching SQL, shell, file paths, HTML, redirects, or server-side fetch (SSRF).
- Secrets or PII in logs, errors, client bundles, URLs.
- New dependencies: necessary? maintained? license?

## Errors and resilience
- Swallowed errors, generic catch-alls, errors that lose the original cause.
- Network calls without timeouts; retries without backoff/caps.
- User-facing failure states handled (the PRD's edge states).

## Tests and gates
- Would a test fail if this change were reverted? If not, coverage is missing.
- Tests that assert implementation details or mocks only (prove nothing).
- **Weakened gates:** deleted/skipped tests, loosened assertions, bumped timeouts, new lint
  disables, `any` casts, snapshot updates without reason. Each must be named.

## Maintainability (P2)
- Logic in the wrong layer (business rules in UI or controllers).
- Duplication of an existing helper (name it).
- Names that mislead; functions doing several things; dead code.
- AI-readability: would the next agent find and understand this via search? Missing types at
  boundaries; magic strings; clever metaprogramming.
- Docs/CLAUDE.md out of date with the change (commands, env vars, layout).
