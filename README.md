# DBA Practicals

### StepUP Tech Academy · Learn it. Restore it. Prove it.

Hands-on database administration guides with short commands, explanations of why
each step matters, and checks that show whether the result is correct.

## PostgreSQL Backup & Recovery

**Students: [open the Backup & Recovery course](postgresql/backup-recovery/README.md).**

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

## For instructors

- [Class preparation and instructor resources](instructor/README.md)
- [Internal testing tools and verification records](internal/README.md) — not student assignments.

> **Lab systems only.** Never run incident simulations against production.
> Do not commit passwords, dumps, globals files, server data, or customer records.
> Use only your assigned class server and connection map. Advanced labs are instructor-led.

The student course is in `postgresql/`. Preparation notes are in `instructor/`;
development tools and test evidence are in `internal/`. Students do not need to
read or run those development tools. These are navigation boundaries, not private
access controls; credentials and personal connection sheets stay outside this public repo.

[StepUP Tech Academy](https://www.stepuptechacademy.co)
