# Review: <branch>

_Date: YYYY-MM-DD · Base: <base>_
Head reviewed: `<short sha>`
_Reviewers: <n> × n-staff-reviewer (opus) · Static: <tools> · Tasks: #a, #b_

## Summary
<One paragraph: what the change does, overall risk.>

## Findings

| # | Sev | Where | Finding (failure scenario) | Status |
|---|---|---|---|---|
| 1 | P1 | path:line | <defect> — <input/state → wrong result> | fixed in <sha> |
| 2 | P2 | path:line | <defect> | open |

Status is one of: `fixed in <sha>` · `open` · `won't fix: <reason>` · `question: <q>`.

## Static analysis
| Tool | Result |
|---|---|
| <semgrep> | <0 findings / n fixed> |
| gitleaks | <clean> |

## Acceptance coverage
| Task / criterion | Implemented | Tested |
|---|---|---|
| #a — <criterion> | ✅ | ✅ `<test>` |

## Weakened gates
<none | list with justification>

Migration safety: <n/a | PASS | FAIL — reasons>

## Gate
**<PASS | BLOCKED>** — <open P0/P1 count>
