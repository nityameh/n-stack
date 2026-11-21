---
name: n-test
description: "Regression, mutation, Playwright-MCP QA and e2e tests for the branch; bugs become failing tests first. Use for \"test\", \"QA\", \"e2e\", \"playwright\", \"does it work\", \"n-test\"."
disable-model-invocation: true
---

# /n-test — prove it works, prove the tests work, keep it working

Default order: REGRESSION → MUTATION → QA → BROWSER. The user can name one mode.
Test bar: `${CLAUDE_SKILL_DIR}/references/test-quality.md`.

## 0. Detect

`n-stack:n-scout`: "Test frameworks and commands (unit, integration, e2e), file locations and
naming, Playwright config, how to start the app and on which port." No framework → propose
the stack default and wire it into `verify` after the user agrees.

## 1. REGRESSION — coverage of what changed

1. Changed behaviour: `git diff <base>...HEAD --stat` + the branch's task acceptance criteria.
2. For each criterion and changed public function/endpoint: is there a test that would fail
   if it broke? Write the missing ones (`n-stack:n-implementer` with a brief for > 3 tests).
3. Full suite. A flaky test is a bug in the test or the code; fix it or quarantine it with a
   `docs/learnings.md` note and a task. Never ignore it.

## 2. MUTATION — do the tests catch bugs?

If `mutation` is configured (Stryker for JS/TS, mutmut for Python), run it on the **changed
source files only** (`{files}` in the command) — it's slow on a whole repo. Each surviving
mutant is a change to the code that no test noticed: write the test that kills it, or note
why it's an equivalent mutant. Report the mutation score for the changed files.
Not configured → offer to add it (recommended for core logic: money, auth, state machines).

## 3. QA — explore like a user

1. Start the app in the background; confirm it responds.
2. Dispatch `n-stack:n-qa-tester` with the URL / API / CLI command, the stories +
   acceptance criteria + edge states for the changed area, and any test account.
   It drives the browser through the Playwright MCP and saves evidence to `.n-stack/tmp/qa/`.
3. For each bug: reproduce it, write a **failing test**, fix (or `/n-debug` if the cause is
   unclear), re-run. A bug in reviewed code → `nstack-event escaped_defect area=<a> class=<c> stage=test`.

## 4. BROWSER — Playwright for critical flows

1. Critical flows = MVP stories' main paths. ~1 test per flow + its most important failure path.
2. No Playwright yet → `npm init playwright@latest` (ask first): chromium + a mobile project,
   `webServer` starts the app.
3. User-facing locators (`getByRole`, `getByLabel`), web-first assertions, no fixed sleeps.
4. Failures → save output, `n-stack:n-log-triager` on it, you diagnose.
5. UI tasks with a design `final.html`: screenshot at 390 px and 1440 px and list visible
   deviations from it.

## 5. Record

`docs/qa/<YYYY-MM-DD>-<branch with / → ->.md` from `${CLAUDE_SKILL_DIR}/templates/qa-report.md`; commit.
`nstack-event skill_run skill=n-test outcome=<ok|bugs> bugs=<n> tests_added=<t> mutation_score=<s>`

## Report

```
REGRESSION: +<n> tests, suite <pass> · MUTATION: <score>% on changed files (<k> survivors left)
QA: <flows> tested, <bugs> found, <fixed> fixed · BROWSER: <n> e2e, <pass>
OPEN: <bugs not fixed>
NEXT: /n-secure (if sensitive) · /n-ship
```
