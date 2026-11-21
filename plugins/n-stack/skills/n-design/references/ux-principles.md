# UX principles and the anti-slop list

## Foundations
- **One primary action per screen.** Visually dominant, consistently placed. Everything else
  is secondary or tertiary.
- **Hierarchy through size, weight, space and position before color.** If the screen works
  in grayscale, the hierarchy is right.
- **Users scan, they don't read.** Front-load labels; headings that say what's there; F/Z
  scan patterns for dense/sparse pages.
- **Recognition over recall.** Show options, recent items, defaults; don't make users remember.
- **Jakob's law.** Users spend most of their time on other products — use conventions they
  already know (nav placement, form patterns, icons with labels).
- **Hick's law.** More choices = slower decisions. Progressive disclosure for advanced options.
- **Fitts's law.** Important targets are big and close; touch targets ≥ 44×44 px.
- **Feedback within 100 ms.** Every action shows a response: pressed state, spinner,
  optimistic update, toast.
- **Forgiveness.** Undo over confirmation dialogs; confirm only destructive, irreversible actions.
- **Nielsen's heuristics** as a final pass: visibility of status, match with the real world,
  user control, consistency, error prevention, recognition, flexibility, minimalist design,
  error recovery, help.

## Every screen has states
Design all of them, not just the happy path:
- **Empty** — first use: explain value + one clear action. Not "No data".
- **Loading** — skeletons for content, spinners only for short actions.
- **Error** — what happened, in plain words, and what to do next. Keep the user's input.
- **Partial / long** — 1 item, 1,000 items, a 200-character name, missing avatar.
- **Permission denied / offline** where relevant.

## Forms
- Labels above inputs (not placeholder-only). Mark optional fields, not required ones.
- Validate on blur, not on every keystroke; errors next to the field.
- Right input types (`email`, `tel`, `numeric`), autocomplete attributes.
- One column. Primary button at the end of the flow, labelled with the verb ("Create invoice").

## Accessibility (WCAG 2.2 AA baseline)
- Contrast ≥ 4.5:1 for body text, 3:1 for large text and UI components.
- Everything reachable and operable by keyboard; visible focus ring.
- Semantic elements (`button`, `nav`, `main`, `label`); alt text; don't rely on color alone.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.

## Visual craft
- Spacing on a scale (4/8 px). Consistent alignment; fewer, stronger edges.
- Max ~2 typefaces; a type scale with clear steps; body 16 px+; line length 50-75 chars.
- Color: one accent used sparingly for primary actions and key state; neutrals do most work.
- Density matches the user: dashboards for experts can be dense; onboarding should breathe.

## Anti-slop list (signs of generic AI design — avoid)
- Purple/blue gradient hero with a vague headline ("Unlock your potential").
- Three identical feature cards with emoji or generic icons.
- Everything centered; no clear reading path.
- Glassmorphism, glows and drop shadows on everything.
- Placeholder copy, lorem ipsum, "John Doe", round numbers.
- Decorative illustrations that say nothing about the product.
- Inconsistent radius, spacing and button styles across one screen.
- Missing states — only the perfect happy path was designed.
