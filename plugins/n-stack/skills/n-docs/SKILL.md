---
name: n-docs
description: "Sync stale docs to the code (nstack-doc markers), re-stamp and commit. Use when docs are reported stale, or for \"update docs\", \"sync docs\", \"n-docs\"."
model: sonnet
---

# /n-docs — docs that stay true

A doc goes stale when the code it describes changes and nobody updates it. n-stack makes
staleness **detectable** (each doc names the code it covers and the commit it was last
checked at), so updating is a small, targeted job instead of a rewrite.

## 1. Find drift (no model work)

```bash
nstack-docs check
```
`stale` = covered code changed since `verified` (files listed). `unverified` = has `covers`
but was never stamped. Nothing to do → say so and stop.

## 2. Update each stale doc

For each stale doc:
1. `git diff <verified>..HEAD -- <covered paths>` (save to `.n-stack/tmp/docs/<doc>.diff` if
   long) and read the doc.
2. Decide per section: still true · now wrong · missing something the change added. Use
   the code map / `LSP` to confirm current names, signatures and flows.
3. Edit **only** the sections that are wrong or incomplete. Keep the doc's structure and
   voice; don't rewrite what's still true. Diagrams (mermaid) must match the new flow.
4. ADRs are history: never rewrite an accepted decision. If the code now contradicts an ADR,
   tell the user — it needs a new superseding ADR, not an edit.
5. `nstack-docs stamp <doc>` to record the commit it now matches.

Several stale docs with independent diffs → dispatch `n-stack:n-implementer` (sonnet) per doc
with the diff path and these rules; review each result.

## 3. Coverage of the important docs

Docs that describe code but have no marker (`docs/architecture/overview.md`,
`docs/design/decisions.md`, area `CLAUDE.md` files, `README.md` setup section) → propose a
`<!-- nstack-doc covers="<globs>" verified="" -->` line for each, then stamp them.
Also check `CLAUDE.md` commands still exist (`package.json` scripts etc.).

## 4. Commit — versions come from git

`git add <docs> && git commit -m "docs: sync <docs> with <short sha>"`.
Every doc version is then recoverable:
- history: `git log --follow -p docs/architecture/overview.md`
- a past version: `git show v1.2.0:docs/architecture/overview.md` (tags made at release)
- roll back one doc: `git restore --source <sha> -- <doc>`

`nstack-event skill_run skill=n-docs outcome=ok docs=<n>`

## Report

```
SYNCED: <doc> (<sections changed>) · …
STAMPED: <doc> → <sha>
ADR CONFLICTS: <none | ADR NNNN contradicted by <change> → needs a superseding ADR>
NEXT: /n-ship
```
