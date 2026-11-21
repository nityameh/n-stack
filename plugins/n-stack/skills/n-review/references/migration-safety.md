# Migration safety checklist

A migration is safe when the old app version and the new one can both run against the
database during the deploy, and when it can be rolled back without data loss. Record the
verdict as `Migration safety: PASS | FAIL — reasons` in the review.

## Expand → migrate → contract

Never change a column in place in one deploy. Instead:
1. **Expand:** add the new column/table (nullable or with a default). Deploy.
2. **Migrate:** dual-write in code; backfill old rows in batches. Deploy.
3. **Contract:** switch reads, then drop the old column in a later deploy.

## Check each migration for

- [ ] **Backward compatible:** the currently running code still works after it runs
      (no dropped/renamed columns or tables it reads; no new NOT NULL without a default).
- [ ] **Locks:** on large tables, avoid operations that rewrite or lock the table
      (adding a column with a volatile default on old Postgres, changing a column type,
      non-concurrent index creation — use `CREATE INDEX CONCURRENTLY`, outside a transaction).
- [ ] **Backfills** run in batches with a limit, are idempotent (safe to re-run), and are not
      inside the schema migration transaction.
- [ ] **Constraints:** add as `NOT VALID` then `VALIDATE` separately on big tables; unique
      constraints checked against existing duplicates first.
- [ ] **Down migration** exists and is tested, or the PR says why it is irreversible and how
      to recover (backup/restore point).
- [ ] **Data loss:** no `DROP`/`TRUNCATE`/destructive `UPDATE` without an explicit, reviewed
      reason and a backup.
- [ ] **Order:** migration runs before the code that needs it (or the code tolerates both).
- [ ] **Tested** against a copy of realistic data volume when the table is large.
- [ ] **Secrets/PII:** no real data in seed or fixture files.
