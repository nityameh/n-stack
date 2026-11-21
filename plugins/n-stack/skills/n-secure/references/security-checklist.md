# Security checklist (OWASP-aligned)

## Access control (most common real-world hole)
- [ ] Every endpoint/resource checks authorization server-side, **per object**: the record's
      owner/tenant matches the caller. Try: change the id in the URL/body.
- [ ] Role checks on admin actions; no "hidden" admin routes protected only by the UI.
- [ ] Mass assignment: request bodies can't set `role`, `ownerId`, `price`, `isAdmin`.

## Authentication and sessions
- [ ] Passwords hashed with a slow hash (argon2/bcrypt/scrypt); never logged.
- [ ] Sessions/tokens expire, rotate on login, are revocable; cookies `HttpOnly`, `Secure`, `SameSite`.
- [ ] Login, signup, reset and OTP endpoints are rate limited; reset tokens single-use and short-lived.
- [ ] No user enumeration through different error messages or timings.

## Injection
- [ ] SQL/NoSQL: parameterized queries only.
- [ ] Shell: no user input in command strings; use argument arrays.
- [ ] Paths: user input never builds file paths without normalization + allow-list (path traversal).
- [ ] HTML: framework auto-escaping; no `dangerouslySetInnerHTML`/`v-html`/`innerHTML` with user data.
- [ ] Templates, `eval`, deserialization of untrusted data: none.

## Server-side request forgery
- [ ] Any server-side fetch of a user-supplied URL is allow-listed and blocks internal ranges
      (169.254.169.254, 10/8, 127/8, localhost).

## Data exposure
- [ ] API responses return only needed fields (no password hashes, tokens, internal ids).
- [ ] PII and secrets never in logs, error messages, URLs, analytics or client bundles.
- [ ] Secrets only in env/secret manager; `.env` git-ignored; gitleaks clean.

## Web
- [ ] CSRF protection for cookie-authenticated state changes.
- [ ] CORS: explicit origins, never `*` with credentials.
- [ ] Security headers: CSP, `X-Content-Type-Options`, `frame-ancestors`/`X-Frame-Options`, HSTS.
- [ ] Open redirects: redirect targets allow-listed.

## Files
- [ ] Uploads: size limits, type checked by content not extension, stored outside the web root
      or in object storage with random names, served with `Content-Disposition`.

## Dependencies and supply chain
- [ ] No known-vulnerable dependencies (osv-scanner / npm audit); lockfile committed.
- [ ] New dependencies are maintained and necessary; no install scripts from unknown packages.
- [ ] CI actions pinned to versions; secrets scoped to the jobs that need them.

## AI features (if the app calls an LLM)
- [ ] User or retrieved content can't change system instructions (prompt injection); model
      output treated as untrusted (never executed, escaped when rendered).
- [ ] Tools the model can call are least-privilege and authorized as the end user, not as admin.
- [ ] Rate limits and spend caps on model calls.
