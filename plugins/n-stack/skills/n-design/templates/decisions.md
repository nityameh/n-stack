# Design decisions
<!-- nstack-doc covers="src/app/**, src/components/**" verified="" -->

Newest first. Each entry is the build spec for one screen or flow. Keep the `covers` list
above in sync with the UI paths these screens live in, so drift is flagged when they change.

## Entry format

    ## <slug> — <Screen name> (YYYY-MM-DD)
    **Chosen:** option <X> (+ elements from <Y>) → explorations/<slug>/final.html
    **Why:** <reason tied to the user's goal and the UX principles>
    **Rejected:** A — <why>; B — <why>

    **Build notes**
    - Components: <new / reused>
    - States: empty · loading · error · <...> (all in final.html via ?state=)
    - Responsive: <what changes below 768 px>
    - Interactions: <keyboard shortcuts, optimistic updates, animations>
    - Accessibility: <focus order, aria notes>
    - Tokens: <exact colors/spacing/type used>
    - Tasks: #a, #b

---
