---
name: n-architect
description: "System design: components, data model, API contracts, diagrams, failure modes, ADRs. Use for \"architecture\", \"system design\", \"data model\", \"ADR\", \"n-architect\"."
disable-model-invocation: true
model: opus
---

# /n-architect — system design and ADRs

Goal: a design simple enough to build this month and explicit enough that every implementer
makes the same choices. Prefer boring, proven technology and a modular monolith until a
requirement forces otherwise.

## 1. Inputs

`docs/product/prd.md`, `CLAUDE.md`, existing `docs/architecture/`. Existing code →
`n-stack:n-scout`: "Map the architecture: entry points, layers, data stores, external
services, auth, background jobs. Cite files." (The scout starts from the code map.)

## 2. Pin the requirements that shape the design

Confirm with the user (one AskUserQuestion; state assumptions for unknown numbers):
scale now and at 10× · latency/availability of the critical path · where stale data is
unacceptable · auth, PII, compliance · budget, hosting, team skills, deadline.

## 3. Design

Walk `${CLAUDE_SKILL_DIR}/references/system-design-checklist.md`. Write
`docs/architecture/overview.md` from `${CLAUDE_SKILL_DIR}/templates/overview.md`: context
diagram, components, data model (`erDiagram`), API contracts precise enough to code against,
`sequenceDiagram` for the top 2-3 flows including the failure path, failure modes, 10× plan,
security, observability, deployment.

Set the doc's drift marker to the code it describes, e.g.
`<!-- nstack-doc covers="src/server/**, src/db/**" verified="" -->`, then after committing:
`nstack-docs stamp docs/architecture/overview.md`. From then on the session start and the ship
gate flag it whenever that code changes.

## 4. Decisions → ADRs

For each decision a reasonable engineer could make differently (database, framework, sync vs
async, auth provider, hosting): 2-3 options, trade-offs, recommendation; the user decides the
hard-to-reverse ones. Record in `docs/architecture/adr/NNNN-<slug>.md` from
`${CLAUDE_SKILL_DIR}/templates/adr.md`. Never edit an accepted ADR's decision — supersede it.

## 5. Feed the task graph

Design-driven work (migrations, infra, auth layer, queue) → new tasks in a plan spec
(`${CLAUDE_PLUGIN_ROOT}/skills/n-plan/references/task-graph.md`) and `nstack-tasks create`.
First-of-pattern tasks are `opus`; point `read_first` at the relevant overview sections.

## 6. Self-review (one line each)

Single point of failure? Most expensive operation? What data could be lost or duplicated?
What could be removed and still meet the PRD?

Commit: `docs: architecture and ADRs for <feature>`.

## Report

```
ARCHITECTURE: docs/architecture/overview.md (drift-tracked: <covers>)
ADRS: 0001-…, 0002-…
BIGGEST RISK: <one line> → mitigation
TASKS ADDED: #…
NEXT: /n-design (screens) · /n-build
```
