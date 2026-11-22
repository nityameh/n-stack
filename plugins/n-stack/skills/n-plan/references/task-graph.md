# Task graph: rules and spec format

Tasks live as GitHub issues (label `n-task`). You never write issues by hand: you write a
JSON spec and `nstack-tasks create` turns it into issues, labels and milestones, resolving
`T-xxx` dependencies into issue numbers.

## Spec (`docs/product/plan.json`)

```json
{
  "milestones": [
    { "id": "M1", "title": "Walking skeleton", "done_when": "signup → dashboard runs end to end locally" }
  ],
  "tasks": [
    {
      "id": "T-001",
      "title": "Sessions table and repository",
      "milestone": "M1",
      "model": "opus",
      "size": "M",
      "tdd": true,
      "stories": ["US-2"],
      "depends_on": [],
      "goal": "Sessions can be created and looked up; expired ones are never returned.",
      "files": ["src/db/schema.ts", "src/db/sessions.ts", "src/db/sessions.test.ts"],
      "read_first": ["src/db/users.ts (pattern to copy)", "docs/architecture/overview.md#data-model"],
      "acceptance": [
        "createSession(userId) persists a row and returns its id",
        "findActive(id) returns null for an expired session"
      ],
      "verify": "npm run test -- src/db/sessions.test.ts",
      "notes": ""
    }
  ]
}
```

## Cutting rules

1. **Walking skeleton first.** M1 = the thinnest end-to-end path (one screen, one endpoint,
   one table), running locally (deployed too if deploy is in scope). Integration risk shows
   up on day one.
2. **Vertical slices.** One story → UI + API + data + tests, not "all models" then "all endpoints".
3. **Size.** Can't name the files, > ~5 files, or > 1 verify command → split. Only S and M.
4. **Tests inside the task.** The acceptance criteria are what the task's tests assert.
5. **Risky first.** Unknowns (third-party API, performance, new library) get an early spike:
   `opus`, output is a `docs/learnings.md` note and a go/no-go.
6. **Parallel-safe.** Tasks that can run together must not share `files`.

## Model rubric

| Model | When |
|---|---|
| `haiku` | Mechanical, zero design decisions: config, rename, copy an existing pattern verbatim, docs |
| `sonnet` | Clear spec + an existing pattern to follow: endpoint, component, repository, tests, known-cause fix |
| `opus` | First instance of a pattern, cross-cutting, ambiguous, security/auth/payments, concurrency, migrations, spikes |
| `me` | The user builds it to learn; n-stack writes the brief and reviews the result |

The first task that establishes a pattern is `opus`; later tasks copying it are `sonnet`.

**`tdd: true`** (becomes the `tdd` label) only on tasks where a wrong answer is plausible and
silent: filters, calculations, permissions, parsing, state machines, claims/eligibility rules.
Mechanical tasks (UI wiring, config, copy, renames, glue) leave it off: `/n-build` with
`testFirst: auto` then skips the separate test-writer run for them, which saves a subagent.

## Status (labels, managed by `nstack-tasks`)

`todo` (no status label) → `status:doing` → `status:built` (committed on a branch) →
closed when the PR that says `Closes #N` merges. `status:blocked` + a comment says why.
Dependencies are satisfied by `built` or closed.
