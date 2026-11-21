# Evidence signals and what to change

All events live in `~/.n-stack/events.jsonl` (local only; names and counts, never prompt
text or code). Written by hooks automatically and by skills via `nstack-event`.

| Event | Written by | Signal | If it's high, change… |
|---|---|---|---|
| `guard_block` (rule) | guard hook | agents attempting forbidden actions | the brief/skill step that leads there; the convention in CLAUDE.md |
| `guard_override` | guard hook | humans approving weakenings | check each was justified; frequent → a real rule is too strict |
| `verify` fail via `stop` | Stop hook | agent tried to finish on red | n-build brief: run verify before reporting; implementer prompt |
| `after_edit_fail` | after-edit hook | errors caught at edit time | good when > 0; if one check dominates, add a convention |
| `skill_run` n-build `attempts`/`escalations` | /n-build | routing calibration | model rubric in n-plan task-graph.md; brief template |
| `skill_run` n-review `findings`/`confirmed`/`dropped` | /n-review | reviewer precision | reviewer prompt (too loose if dropped/findings > 30%) |
| `escaped_defect` (class, stage) | /n-debug, /n-test | review/test blind spots | review checklist, test-quality bar, static tools |
| `command` (name) | prompt hook | which stages are used | stages never used → simplify or merge them (or make n-kit) |
| `agent_done` (agent) | SubagentStop hook | delegation volume | cost vs value of each agent |
| `idea_session` (verdict, assignment) | /n-ideate | idea follow-through | the assignment format |
| ccusage cost | `--cost` | spend | the biggest consumer first (often main-session reading) |

## Healthy ranges (starting points; tune with your own data)

- Verify attempts per task: ≤ 2 on average.
- Escalations: < 15% of tasks.
- Review false-positive rate: < 30%.
- Escaped defects: trending down; every one becomes a checklist item or test pattern.
- Stop-gate fails: rare after the first week; persistent → briefs are missing verify.
