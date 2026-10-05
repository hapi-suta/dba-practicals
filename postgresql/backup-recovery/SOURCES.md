# Sources and version boundaries

Reviewed 2026-10-05. PostgreSQL 18 official pages and the live pgBackRest guide;
PostgreSQL 14 official equivalents checked for the local 14.20 rehearsal.
Source review does not replace execution on the actual class environment.

| Source | Used for |
|---|---|
| [PostgreSQL SQL dump](https://www.postgresql.org/docs/18/backup-dump.html) | Snapshot boundary, separate targets, globals, post-restore statistics |
| [pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html) | Plain/custom formats, schema/table filters and dependency limits |
| [pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html) | Archive listing, restore errors and selection limits |
| [pg_basebackup](https://www.postgresql.org/docs/18/app-pgbasebackup.html) | Physical copy, streamed WAL, replication access |
| [Continuous archiving/PITR](https://www.postgresql.org/docs/18/continuous-archiving.html) | Required WAL, isolated recovery, target handling |
| [pgBackRest guide](https://pgbackrest.org/user-guide.html) | Stanza, repository, archive checks, backup sets and PITR |
| [PostgreSQL 14 pg_dump](https://www.postgresql.org/docs/14/app-pgdump.html) | Local rehearsal compatibility |
| [PostgreSQL 14 archive recovery](https://www.postgresql.org/docs/14/continuous-archiving.html) | Version-matched recovery background |

No native PostgreSQL incremental-backup commands are taught in this pack;
pgBackRest full/differential/incremental are its own backup types. Actual class
server and pgBackRest versions have not yet been supplied. No claim is made that
these labs are a complete production backup/security policy or a HA runbook.

Lab 8 uses a named restore point for a deterministic drill. A real timestamp
target needs incident investigation, correct time zone and a boundary before the
damaging COMMIT; a logged DELETE start time alone is not a commit timestamp.
