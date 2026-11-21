# System design checklist

Walk each section. Write "n/a — <reason>" rather than skipping silently.

## Shape
- [ ] Modular monolith unless a requirement forces a split (independent scaling, separate
      team, different runtime). Name the requirement if splitting.
- [ ] Each module has one responsibility and owns its data. No two modules write the same table.
- [ ] Dependency direction: UI → application → domain. Domain has no I/O.
- [ ] Sync request/response for user-facing reads; async (queue/job) for slow, retryable or
      fan-out work (emails, webhooks, media, AI calls).

## Data
- [ ] Source of truth for each entity named.
- [ ] Relational DB (Postgres) by default; justify anything else in an ADR.
- [ ] Indexes for every query on the critical path. Know the read:write ratio.
- [ ] Migrations are backward-compatible (expand → migrate → contract) so deploys can roll back.
- [ ] IDs: UUIDv7/ULID or DB sequences — decided once.
- [ ] Soft vs hard delete decided; retention and PII deletion path defined.

## APIs and contracts
- [ ] Contract per endpoint: method, path, request schema, response schema, error codes, auth.
- [ ] Input validated at the boundary with a schema.
- [ ] Pagination for every list. Cursor-based for large or changing data.
- [ ] Idempotency keys for operations that create money, messages or side effects.
- [ ] Versioning strategy (or explicitly "internal, no versioning").
- [ ] Consistent error shape: `{ code, message, details }`.

## Reliability
- [ ] Timeouts on every outbound call. Retries only for idempotent operations, with
      exponential backoff + jitter, and a cap.
- [ ] What the user sees when each dependency is down.
- [ ] Background jobs: at-least-once delivery → handlers are idempotent; dead-letter path.
- [ ] Race conditions: concurrent edits (optimistic locking / version column), double submits,
      check-then-act sequences (use transactions or unique constraints).

## Scale (design for now, know the 10× answer)
- [ ] What breaks first at 10×: DB connections, a hot table, an N+1, a single worker, a rate
      limit on a third-party API.
- [ ] Caching only where measured need exists; define invalidation when you add it.
- [ ] Rate limiting on public and expensive endpoints.

## Security
- [ ] Authentication method; session vs token; expiry and revocation.
- [ ] Authorization checked server-side on every resource access (object-level, not just route).
- [ ] Secrets in environment / secret manager, never in code or client bundles.
- [ ] OWASP top risks considered: injection, broken access control, SSRF, XSS, CSRF,
      insecure deserialization, vulnerable dependencies.
- [ ] PII inventory and where it is logged (it shouldn't be).

## Observability
- [ ] Structured logs with request id; error tracking (e.g. Sentry).
- [ ] The 3-5 metrics that say the system is healthy (latency p95, error rate, queue depth,
      signups…).
- [ ] Health check endpoint.

## Delivery
- [ ] Environments: local, preview/staging, production.
- [ ] Hosting choice and why (ADR). Rollback method.
- [ ] CI runs the verify command on every PR.
- [ ] Feature flags for risky launches (only if needed).

## Cost
- [ ] Rough monthly cost at current and 10× scale; the most expensive line item (often LLM
      calls, egress, or managed DB size).
