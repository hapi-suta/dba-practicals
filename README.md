# DBA Practicals

### StepUP Tech Academy · Learn it. Restore it. Prove it.

Hands-on database administration guides with short commands, explanations of why
each step matters, and checks that show whether the result is correct.

## PostgreSQL Backup & Recovery

**Teaching today? Start with [Lab 0 — connect and prepare the shop](postgresql/backup-recovery/00-start.md).**

| Path | What you will practice | Readiness |
|---|---|---|
| [Start here](postgresql/backup-recovery/README.md) | Lab sequence, time estimates and safety rules | Course index |
| [0 · Prepare](postgresql/backup-recovery/00-start.md) | Login, connection checks and sample shop data | Database steps locally rehearsed |
| [1 · Plain backups](postgresql/backup-recovery/01-plain.md) | pg_dump → separate psql restore | Locally rehearsed |
| [2 · Custom archives](postgresql/backup-recovery/02-custom.md) | pg_restore, schema/table selection, sequence check | Locally rehearsed |
| [3 · Recover a table](postgresql/backup-recovery/03-table.md) | Recover a dropped table without losing newer orders | Locally rehearsed |
| [4 · Access](postgresql/backup-recovery/04-roles.md) | Globals export, restored read-only privileges | Locally rehearsed |
| [5 · Physical backup](postgresql/backup-recovery/05-physical.md) | pg_basebackup and isolated cluster restore | Instructor setup/rehearsal required |
| [6–8 · WAL and PITR](postgresql/backup-recovery/06-pgbackrest-pitr.md) | pgBackRest backup chains and recovery before a delete | Instructor setup/rehearsal required |
| [9–11 · Incident drills](postgresql/backup-recovery/09-drills.md) | Return missing rows, recover a database, measure recovery | Advanced procedures; host rehearsal required |

## See the tests run

The [live rehearsal viewer](postgresql/backup-recovery/WATCH.md) displays **real
PostgreSQL commands and results** in a clear dark layout. It runs locally on your
machine, not on GitHub, and tests only Labs 0–4 in a private temporary cluster.

## For instructors

- [Preparation and teaching notes](postgresql/backup-recovery/INSTRUCTOR.md)
- [Student evidence worksheet](postgresql/backup-recovery/EVIDENCE.md)
- [Validation and known limits](postgresql/backup-recovery/VALIDATION.md)
- [Official documentation references](postgresql/backup-recovery/SOURCES.md)
- [Machine-readable core test summary](postgresql/backup-recovery/evidence/core-rehearsal.json)

> **Lab systems only.** Never run incident simulations against production.
> Do not commit passwords, dumps, globals files, server data, or customer records.
> Advanced procedures contain instructor-filled paths and must not be pasted unchanged.

The core database exercises were rehearsed on PostgreSQL 14.20/macOS. This is not
proof that a student's Linux login, paths, version or pgBackRest installation is
ready. Check the instructor worksheet before class.

[StepUP Tech Academy](https://www.stepuptechacademy.co)
