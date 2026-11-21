# Prompt and context patterns

## Prompt engineering
- **Goal + definition of done first.** The model optimizes for what you say success looks like.
- **Numbered workflow** for multi-step work; each step names its check.
- **Say why for non-obvious rules.** "Never mock the DB in integration tests — mocks hide
  migration bugs" generalizes better than "never mock the DB".
- **Positive instructions over prohibitions.** "Use `getByRole` locators" beats "don't use CSS
  selectors". Use prohibitions only where the default behaviour is wrong.
- **Fixed output format** with a short template. Downstream steps (and you) parse it.
- **One worked example** when the format or judgment is subtle. Make it realistic.
- **Role in one line**, not a persona essay.
- **Calibrate emphasis.** CAPS and "CRITICAL" everywhere teach the model that nothing is critical.

## Context engineering
- **Progressive disclosure:** the always-loaded part (description, SKILL.md) is short; detail
  lives in files read at the step that needs them.
- **Point, don't paste:** give paths and line ranges; let the agent read.
- **Compress at boundaries:** subagents return fixed-shape summaries, never raw output.
- **Durable state in files:** plans, decisions and progress go to files so a fresh session
  (cheaper, uncluttered) can resume.
- **Fresh context for fresh work:** after ~6 tasks or a big exploration, start a new session.
- **Order matters:** stable instructions first, task-specific details last.

## Description field (decides triggering)
- Start with what it does; then "Use when …" with real user phrasings; then sequencing
  ("Use before /n-plan").
- Mention the artifacts it reads/writes — helps the model match it to the situation.
- Side-effecting skills (push, deploy, delete): `disable-model-invocation: true` so only the
  user can start them.

## Harness engineering
- Narrowest `tools` list per agent (reviewers read-only).
- Pin `model` per agent by the routing rubric.
- Deterministic commands for checks; never ask the model to "verify by reading".
- Hooks for things that must always happen (format, protect files) — prose can be ignored,
  hooks can't.

## Loop engineering
- Every loop: action → objective check → bounded retry → escalate → exit to the human.
- Feed the loop the *diagnosis*, not the raw failure.
- Record the attempts so an escalation starts informed.

## Graph engineering
- Model work as nodes with explicit inputs/outputs and dependencies.
- Parallelize only nodes with disjoint write sets.
- Make each node's output an artifact another node can consume without the chat history.
