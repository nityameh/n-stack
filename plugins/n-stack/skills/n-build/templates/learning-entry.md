# #<issue> <title>

_Built by: <model> · <date> · commit <sha> · task: <issue link>_

## What was built
<2-3 sentences, plain language: the behaviour that exists now and who it's for.>

## Why this approach
<The decision and its reason. Then the alternatives considered and why each was rejected —
e.g. "a background job was rejected because the user needs the result before the page
reloads".>

## Concepts used
For each concept: what it is in one or two sentences **in the context of this code**, where
it appears (`path:line`), and one good link.
- **<Concept, e.g. Idempotency key>** — … (`src/api/payments.ts:40`) — <link>

## Principles applied
Named principles and exactly where they show up.
- **<e.g. Parse, don't validate>** — the request body is parsed into a typed object at the
  boundary (`src/api/schema.ts:12`), so the handler never sees unvalidated data.

## How it was done, step by step
1. <step and why it came in this order>
2. …

## Edge cases and the test that proves each
| Edge case | Handling | Test |
|---|---|---|
| <empty input> | <what the code does> | `<test name>` in `<path>` |

## Verify it yourself
- Run: `<command>` — expect: <what you should see>
- Read: <the 2-3 places worth reading first, in order>

## Check your understanding
1. <question that requires understanding, not recall>
2. <what would break if X were removed?>
3. <how would you extend this for Y?>

<details><summary>Answers</summary>

1. …
2. …
3. …

</details>
