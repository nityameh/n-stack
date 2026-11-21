# n-stack lifecycle

```
/n-init (once per repo)
   │
/n-ideate ─▶ /n-plan ─┬─▶ /n-architect ─┐
                      └─▶ /n-design ────┴─▶ /n-build ─▶ /n-review ─▶ /n-test ─▶ (/n-secure) ─▶ /n-docs ─▶ /n-ship ─▶ /n-retro
                                               ▲    │                   │                                   │
                                               └── /n-debug ◀───────────┴───────────────────────────────────┘
```

| Stage | Reads | Writes |
|---|---|---|
| /n-init | repo | CLAUDE.md, .n-stack/, .githooks/, docs/ skeleton |
| /n-ideate | ~/.n-stack/ideas.jsonl | docs/product/idea.md |
| /n-plan | idea.md | docs/product/prd.md, GitHub issues (n-task), milestones |
| /n-architect | prd.md | docs/architecture/overview.md, adr/ |
| /n-design | prd.md | docs/design/ (system, explorations, decisions) |
| /n-build | ready issues | code, tests, commits, docs/learning/ |
| /n-debug | a failure | fix + regression test, learnings.md |
| /n-review | branch diff + static checks | docs/reviews/<date>-<branch>.md |
| /n-test | running project, prd | tests, docs/qa/<date>-<branch>.md |
| /n-secure | branch or whole app | docs/security/<date>.md |
| /n-docs | stale docs + diffs | updated docs, re-stamped |
| /n-ship | gate PASS | PR, CHANGELOG.md, deploy |
| /n-retro | ~/.n-stack/events.jsonl, git | docs/retro/<date>.md, /n-forge proposals |
