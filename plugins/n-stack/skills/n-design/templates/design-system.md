# Design system

_Feel: <adjective>, <adjective>, <adjective> · Users: <who, where> · Date: YYYY-MM-DD_

## Principles
1. <e.g. "Content first: chrome recedes, data leads.">
2. <...>
3. <...>

## Color tokens
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | | | page background |
| `--surface` | | | cards, panels |
| `--text` | | | body text |
| `--muted` | | | secondary text |
| `--line` | | | borders, dividers |
| `--accent` | | | primary actions, focus |
| `--danger` | | | destructive, errors |
| `--success` | | | confirmations |

Contrast checked: text/bg ≥ 4.5:1, accent/bg ≥ 3:1.

## Typography
- Display / UI / Mono families: <...>
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 40 (line-heights …)

## Spacing, radius, elevation, motion
- Spacing: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4 · md 8 · lg 12 · full
- Elevation: <levels>
- Motion: 150 ms ease-out for UI feedback, 250 ms for panels; respects reduced motion

## Components
| Component | Variants | States |
|---|---|---|
| Button | primary, secondary, ghost, danger | default, hover, focus, active, disabled, loading |
| Input | text, select, textarea | default, focus, error, disabled |
| … | | |

## Implementation
<Where tokens live in code (CSS variables file, Tailwind config, theme object).>
