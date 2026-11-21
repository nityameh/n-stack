# n-stack — working on this repo

A Claude Code plugin marketplace. The plugin lives in `plugins/n-stack/`: skills, agents,
hooks (Node, no dependencies), `lib/` (shared logic), `bin/` (CLIs on the Bash PATH while the
plugin is enabled) and `project-kit/` (files `nstack-project init` copies into projects).
Read `README.md` for the map, `ETHOS.md` for the principles.

## Commands

- **Test (run after any change to hooks, lib or project-kit):** `node --test plugins/n-stack/test/harness.test.mjs`
  — every bug fixed in a hook or the gate gets a test case here first.
- Validate the plugin: `claude plugin validate ./plugins/n-stack`
- Syntax-check scripts: `for f in plugins/n-stack/{lib,hooks}/*.mjs plugins/n-stack/project-kit/n-stack/bin/*.mjs; do node --check "$f"; done`
- Test a hook: pipe sample JSON on stdin, check the exit code (2 = block, 0 = allow).
- After editing: start a new `claude --plugin-dir ~/n-stack/plugins/n-stack` session; it reads this folder directly.

## Rules

- `SKILL.md` stays short (aim < 120 lines); detail in `references/`, artifacts in `templates/`.
  Reference them with `${CLAUDE_SKILL_DIR}` / `${CLAUDE_PLUGIN_ROOT}`, never `~` paths.
- Frontmatter `description` = what it does + "Use when …" with real user phrases + sequencing.
- Every skill names its inputs, its output, and `NEXT:`. Keep `docs/artifact-graph.md` in sync.
- Agents: pinned `model`, narrowest `tools`, an untrusted-content rule, a fixed output shape.
  Read-only agents get no Edit/Write/Bash (the guard hook also enforces it). Dispatch them as
  `n-stack:<name>`.
- Deterministic work goes in scripts (`lib/`, `bin/`), never in prose.
- Hooks: quiet on success, exit 2 with a fix-it message to block, never crash a session
  (wrap risky work in try/catch), inert outside projects with `.n-stack/config.json`.
- `project-kit/n-stack/bin/*.mjs` must stay standalone (CI runs them without the plugin).
- Every loop has a budget and an exit to the user.
- Change skills because of evidence (`/n-retro`), via `/n-forge`.
