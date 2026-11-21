---
name: n-design
description: "Visual brainstorm before code: 3-4 clickable HTML options of a screen, iterate, record the chosen spec; also design systems. Use for \"design this\", \"UI\", \"mockup\", \"show me options\", \"n-design\"."
disable-model-invocation: true
model: opus
---

# /n-design — see it, choose it, then build it

Two jobs: help the **human** see ideas they couldn't picture yet, and give the **agent** an
unambiguous picture of the UI so it builds what was meant, not a guess. Picking between real
screens takes a minute; rebuilding the wrong one takes a day.

Load `${CLAUDE_SKILL_DIR}/references/ux-principles.md` now; every option is checked against it.

## 1. Intake — capture what they're imagining (≤ 4 questions, one message)

- What is this screen for, and who's using it, where (desk, phone, in a hurry)?
- What do you already picture? Apps or sites you love or hate for this? (A screenshot, a
  Figma link or a rough sketch counts — with the Figma MCP connected, read the frame.)
- What must the user be able to do here, in order of importance?
- How should it feel (2-3 words)?
Plus silently: PRD stories, acceptance criteria and edge states; `docs/design/design-system.md`;
the app's existing UI (`n-stack:n-scout`: framework, styling, component library, tokens, 2-3
representative screens).

No design system and this is a new product → run **SYSTEM** (below) first, short version.

## 2. Brainstorm board — options that differ in idea, not paint

1. Propose 3-4 directions as one line each: name + the bet it makes. They must differ in
   **structure or interaction model** (list-detail vs. cards vs. guided steps; dense power
   view vs. calm focus; inline editing vs. modal; chat-first vs. form-first). Include one
   that is close to what the user described and one that is a surprise.
2. Build each as one self-contained HTML file in `docs/design/explorations/<slug>/option-<a…d>.html`:
   - tokens from the design system as CSS variables (or the app's real Tailwind/theme values),
   - **realistic content** from the domain (real names, numbers, long titles — never lorem ipsum),
   - the primary flow clickable; `?state=empty|loading|error` toggles all states,
   - works at 390 px and 1440 px; semantic HTML, labels, focus styles, AA contrast.
   Options are independent: dispatch parallel `n-stack:n-implementer` agents (one brief each,
   files limited to its option) and review what comes back yourself.
3. Copy `${CLAUDE_SKILL_DIR}/templates/compare-board.html` to `index.html` in that folder, fill
   names and bets, and open it (Windows `cmd.exe /c start "" "<abs path>"`, macOS `open`,
   Linux `xdg-open`).
4. Give your own critique first: for each option, primary-action clarity, hierarchy,
   cognitive load, states, accessibility, and fit with what they said. Recommend one.

## 3. Converge (max 3 rounds)

Ask for reactions, not just a pick: "what do you like, what bothers you, anything to steal
from another option?" Combine and refine into `final.html`. Each round, change only what the
feedback asked for and say what changed.

## 4. Hand-off spec for the agent

Record in `docs/design/decisions.md` (from `${CLAUDE_SKILL_DIR}/templates/decisions.md`):
chosen option and why, what was rejected and why, and **build notes** — components
(new/reused), every state, responsive behaviour, interactions, accessibility, exact tokens.
Mark it `<!-- nstack-doc covers="<UI paths for this screen>" -->` so drift is caught later.
Point the related task issues' "Read first" at `final.html` and the decision (comment on the
issue or update the spec).

Optional: if the Figma MCP is connected and the user wants it, push `final.html` to Figma
(html-to-Figma) for further hand-editing.

## SYSTEM mode (design system)

Ask feel, users, references (3 questions max). Propose tokens (semantic colors with light and
dark values and contrast checked, type scale, 4/8 px spacing, radius, elevation, motion) and
core components with states, per `${CLAUDE_SKILL_DIR}/templates/design-system.md`. Render a
one-page specimen (`explorations/_system/index.html`) and open it. Iterate, then write
`docs/design/design-system.md`.

## Report

```
OPTIONS: docs/design/explorations/<slug>/index.html (<n> options)
CHOSEN: <option> → final.html — <one line why>
SPEC: docs/design/decisions.md#<slug>
NEXT: /n-build
```
