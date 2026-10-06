# What we’re doing in each lab

The story: protect Bob’s shop, practise recovering it, then prove that the right
data and access came back. Each lab starts with a short summary and end result.

## Beginner session — logical backups

A logical backup saves SQL or database objects and their rows. You restore it
with `psql` or `pg_restore`, depending on the backup format.

| Lab | What we do | What it teaches |
|---|---|---|
| [0 — Set up](00-start.md) | Connect to your assigned server and create known shop data. | Know your target and starting counts before changing anything. |
| [1 — Plain SQL](01-plain.md) | Save SQL and restore it into a different database. | A backup is useful when you can restore and verify it. |
| [2 — Custom archives](02-custom.md) | Inspect and restore custom, schema and table archives. | Choose what to back up; check objects, data and sequences. |
| [3 — Dropped table](03-table.md) | Drop and recover one table in a disposable copy. | Recover the missing object without losing newer orders. |
| [4 — Roles and access](04-roles.md) | Save role definitions and test a restored reader’s permissions. | Recover access as well as data; reading must not allow deleting. |

## Instructor-led session — physical backup and recovery

A physical backup copies a PostgreSQL cluster's files. Archived WAL can then
replay later changes to reach a chosen recovery point.

| Lab | What we do | What it teaches |
|---|---|---|
| [5 — Physical copy](05-physical.md) | Copy, verify and start a separate cluster on port 55433. | Keep source and recovery copies safely isolated. |
| [6 — pgBackRest and WAL](06-pgbackrest-pitr.md#lab-6a--configure-the-repository) | Configure the source path, repository and WAL archiving. | Backups and archived WAL need the right configuration. |
| [7 — Backup chain](06-pgbackrest-pitr.md#lab-7--create-and-inspect-the-backup-chain) | Take full, incremental and differential backups around changes. | Understand what each captures and which files recovery requires. |
| [8 — PITR](06-pgbackrest-pitr.md#lab-8a--create-an-incident-with-a-known-safe-boundary) | Simulate a deletion; recover a copy to a named safe point using WAL. | Restoring files is not enough to recover changes after a backup. |
| [9 — Return missing rows](09-drills.md#lab-9--bring-back-only-marias-missing-order) | Check the recovered order and item in temporary tables, then add only those missing rows to SOURCE. | Keep valid newer orders while returning the lost data. |
| [10 — Dropped database](09-drills.md#lab-10--a-whole-database-is-dropped) | Drop a separate drill database and restore an older dump. | Recognize the limits of a backup snapshot. |
| [11 — Prove recovery](09-drills.md#lab-11--failures-recovery-objectives-and-runbook) | Diagnose a wrong database name, restore into a new target and record the result. | Explain the error and prove SOURCE was untouched; advanced faults need separate preparation. |

## Before every step

1. Check **where**: Linux terminal or psql; SOURCE 5432 or COPY 55433.
2. Read **why**, then run one command and compare its **expected result**.
3. If it differs, stop and use [troubleshooting](TROUBLESHOOTING.md). Do not reset
   or repeat writes to make the numbers match.

Use the [connection map](CLASS-SETUP.md), [read-only checker](CHECKS.md) and
[evidence sheet](EVIDENCE.md). These exercises are for assigned disposable labs,
never production. Allow more than one class to finish the full sequence.
