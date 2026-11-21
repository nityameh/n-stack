---
name: n-forge
description: "Create or improve a skill, agent, hook or prompt from evidence, at the lowest level that works. Use for \"make a skill\", \"improve this skill\", \"add a hook\", \"n-forge\"."
disable-model-invocation: true
model: opus
---

# /n-forge — build and sharpen the tools

A skill is a prompt that runs many times, so every word is paid for on every run. Goal: the
**smallest instruction set that reliably produces the right behaviour**, changed because of
evidence, not taste.

## 1. The job and the evidence

What should happen, when should it trigger, and what goes wrong today? Get a **concrete
failing example** (a transcript excerpt, a bad output, a retro number). No example → write
the expected behaviour as a test case first.

Where it lives:
- n-stack itself → `~/n-stack/plugins/n-stack/` (skills/, agents/, hooks/, lib/). Claude Code
  is loaded with `claude --plugin-dir ~/n-stack/plugins/n-stack`, straight from this folder: edits apply in the next session.
- One project only → `<project>/.claude/skills/<name>/` or a `CLAUDE.md` line.

## 2. Lowest level that fixes it

Read `${CLAUDE_SKILL_DIR}/references/prompt-patterns.md`. Pick the first that works:
1. **Nothing** — the model already does it. Don't write it.
2. **A deterministic fix** — a script, a hook, a CLI flag. Prose can be ignored; code can't.
3. **One line** in a project `CLAUDE.md` or an existing skill step — edit the failing line,
   don't append a new rule.
4. **A reference file** loaded by an existing step.
5. **A new skill** — a repeatable workflow with its own inputs and output.
6. **A subagent** — needs its own context, a pinned model, or restricted tools.

## 3. Write it

Skill: frontmatter (`name`, `description` = what + "Use when …" + sequencing; `model` only if
it must differ; `disable-model-invocation: true` for side effects), then goal (1-2 lines),
inputs, numbered steps each with its check, fixed report ending in `NEXT:`. Reference files
via `${CLAUDE_SKILL_DIR}/…`, other plugin files via `${CLAUDE_PLUGIN_ROOT}/…` — never `~`.
Agent: `name`, `description` (when to dispatch), narrowest `tools`, `model`; role in one line,
method, untrusted-content rule, fixed output. Hook: Node script in `hooks/`, registered in
`hooks/hooks.json`, quiet on success, exit 2 with a fix-it message on block.

## 4. Test it

Run it on the failing example and one normal case. Check: triggers from a natural phrasing?
Loads only the references it needs? Output in the specified shape? Hook: feed it sample JSON
on stdin and check the exit code. Max 3 rounds.

## 5. Ship it

Update `README.md` tables, `docs/artifact-graph.md`, `docs/model-routing.md` if affected;
bump `version` in `.claude-plugin/plugin.json`; commit in `~/n-stack` with the evidence in
the message (`fix(n-review): … — retro: 4 escaped null-handling bugs`).

## Report

```
CHANGED: <paths> · LEVEL: <why this level>
EVIDENCE: <the failure or metric that motivated it>
TESTED ON: <case> → <result> · METRIC TO WATCH: <for the next /n-retro>
```
