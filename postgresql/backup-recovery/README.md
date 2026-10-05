# PostgreSQL Backup & Recovery — practical labs

StepUP Tech Academy · Student handouts · 2026-10-05

Bob's shop has customers, orders and order items. Your job is to recover usable
data without overwriting good data that arrived after the backup.

## Start here

Use a **disposable, instructor-approved PostgreSQL lab**, one cluster per student.
Never run the incident exercises against a company database. Do not destroy the
server, remove PGDATA, stop an existing service or delete backup/WAL files.

| Order | Lab | Suggested time | Result |
|---|---|---|---|
| 0 | [Connect and create the shop](00-start.md) | 15–20 min | Known data and correct connection |
| 1 | [Plain SQL backup and restore](01-plain.md) | 15 min | A separate restored database |
| 2 | [Custom, schema and table backups](02-custom.md) | 20 min | Inspect and restore archives |
| 3 | [Recover a dropped table](03-table.md) | 15 min | Table, data and dependencies recovered |
| 4 | [Roles and access](04-roles.md) | 15 min | Recovered permissions checked |
| 5 | [Physical backup](05-physical.md) | 25 min | A separate physical cluster copy |
| 6–8 | [pgBackRest, WAL and PITR](06-pgbackrest-pitr.md) | 60–90 min | Recovery before a committed mistake |
| 9–11 | [Incident drills and evidence](09-drills.md) | 30–45 min | Missing rows returned; recovery verified |

Do not rush every lab into one class. For today's first session, do 0–3 and the
access check in 4. Physical/PITR work needs the instructor preparation gate.

Each command block is one action. `bash` means the Linux terminal; `sql` means
inside psql. `psql` blocks contain psql commands such as `\q`. Do not type the
prompt itself. A query returning the expected result is evidence; a file merely
existing is not proof of recoverability. Expected results below are predictions,
not fabricated captures from your machine.

**Version and rehearsal:** see [VALIDATION.md](VALIDATION.md). The class server's
version, OS and pgBackRest configuration must be confirmed before teaching.
Logical steps use features available in PostgreSQL 14–18. Physical recovery must
use compatible binaries/extensions and matching major versions.

Sources and limits: [SOURCES.md](SOURCES.md). Instructor setup and delivery:
[INSTRUCTOR.md](INSTRUCTOR.md). Submit [your evidence](EVIDENCE.md), not passwords
or backup files. Do not commit database dumps to this repository.

## Instructor demonstration

[Open the live-rehearsal instructions](WATCH.md) to run the same real core tests
with a readable dark command/output viewer. No database server runs on GitHub.
