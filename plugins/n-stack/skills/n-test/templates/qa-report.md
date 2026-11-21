# QA: <branch>

_Date: YYYY-MM-DD · Head: <sha> · Target: <url / command>_

## Regression
- Tests added: <n> (<paths>)
- Suite: <pass/fail>, <total> tests, <duration>
- Acceptance criteria with no automated test: <list or "none">

## Exploratory QA
| Flow | Result | Notes |
|---|---|---|
| US-1 happy path | ✅ | |
| US-1 empty state | ❌ bug #1 | |

## Bugs
| # | Sev | Title | Repro | Status |
|---|---|---|---|---|
| 1 | High | | steps / evidence path | fixed in <sha> + test <path> / open |

## Browser (Playwright)
- Specs: <paths> · Result: <pass/fail> · Viewports: desktop, mobile
- Visual deviations from design: <list or "none">

## Not tested
<what, why>
