# Test quality bar

A test earns its place if it **fails when the behaviour breaks** and **passes when only the
implementation changes**.

## Keep / write
- Tests of observable behaviour through the public interface (function output, HTTP
  response, rendered UI, DB state).
- One behaviour per test, named as a sentence: `rejects signup when email already exists`.
- Edge cases from the PRD and from the code's branches: empty, max, invalid, duplicate,
  unauthorized, concurrent.
- Regression tests for every fixed bug, named for the bug's behaviour.
- Integration tests for DB queries and API handlers against a real (containerized or
  in-memory) database where feasible — mocks of the DB hide the bugs that matter.

## Avoid
- Tests that assert mocks were called with exactly the arguments the code passes (they
  restate the implementation).
- Snapshot tests of large structures nobody reads.
- Tests that pass with the feature deleted (assertion-free, or only asserting "no throw").
- Fixed `sleep`s; real network; real clock; shared state between tests.
- Testing private helpers directly instead of through their caller.

## Pyramid
- Unit (fast, many): pure logic, validation, formatting, state machines.
- Integration (some): handlers + DB, service + external API (with a fake server).
- E2E (few): critical user flows in a real browser.

## Flaky tests
A flaky test is a bug in the test or in the code (often a race). Find which. Quarantine only
with a note in `docs/learnings.md` and a task to fix it.
