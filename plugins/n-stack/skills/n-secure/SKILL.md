---
name: n-secure
description: "Optional security review: STRIDE, secret/dependency/SAST scanners, OWASP checks with exploit scenarios. Use for \"security review\", \"is this secure\", \"audit\", \"n-secure\"."
disable-model-invocation: true
model: opus
---

# /n-secure — think like an attacker, prove like an engineer

Optional, and worth it whenever the change touches identity, money, permissions, uploads,
personal data or anything public. Every finding needs a concrete exploit scenario; "could be
insecure" is not a finding.

## 1. Scope

Ask: **this branch** (default) or **whole app**? Read `docs/architecture/overview.md` (data
flows, trust boundaries) and the code map. Branch scope: `git diff <base>...HEAD`.

## 2. Scanners (no model tokens; skip any that isn't installed and say so)

```bash
gitleaks git --redact --no-banner                       # secrets in history
osv-scanner scan source -r .                            # vulnerable dependencies (or: npm audit --omit=dev / pip-audit)
semgrep scan --config p/owasp-top-ten --error --quiet   # SAST
```
Save outputs to `.n-stack/tmp/security/`. Triage each hit: real · false positive (why) · accepted risk.

## 3. Threat model (STRIDE on each trust boundary)

For each data flow that crosses a boundary (browser → API, API → DB, API → third party,
webhook → API, admin → app): **S**poofing, **T**ampering, **R**epudiation, **I**nformation
disclosure, **D**enial of service, **E**levation of privilege. One line each: threat → current
control → gap.

## 4. Code review against the risks that matter most

Walk `${CLAUDE_SKILL_DIR}/references/security-checklist.md` against the scope. For each issue:
the attacker, the request they send, what they get. Check authorization **per object** (can
user A read user B's invoice by changing the id?).

## 5. Fix and record

Present findings by severity (Critical/High/Medium/Low) with exploit and fix. Ask which to fix
now; fixes get a test that reproduces the attack. Write `docs/security/<YYYY-MM-DD>.md`
(scope, scanners run, threat model table, findings with status). Add any open High+ to the
branch's review record as P0/P1 so the ship gate holds the line.

`nstack-event skill_run skill=n-secure outcome=<ok|findings> critical=<n> high=<n>`

## Report

```
SCOPE: <branch|app> · SCANNERS: <ran / skipped>
FINDINGS: Critical <a> · High <b> · Medium <c> · Low <d> — fixed <x>
RECORD: docs/security/<file>
NEXT: /n-ship
```
