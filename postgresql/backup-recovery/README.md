# PostgreSQL Backup & Recovery — practical labs

StepUP Tech Academy · Student handouts · 2026-10-05

Bob's shop has customers, orders and order items. Your job is to recover usable
data without overwriting good data that arrived after the backup.

## Start here

**New:** [What we’re doing in each lab — one-page overview](LAB-OVERVIEW.md).
Read this first; every individual lab also starts with its purpose and end result.

1. Read [your server connection map](CLASS-SETUP.md): SOURCE 5432 versus COPY 55433.
2. Follow the beginner labs 0–4. Run each write once; record the expected checks.
3. Use [read-only checks](CHECKS.md) and [resume/error help](TROUBLESHOOTING.md).
4. Move to instructor-led Labs 5–11 only after the source baseline is correct.

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

**Class edition:** commands now use actual StepUP server paths, not `/LAB`
placeholders. Do not substitute your source directory for a recovery-copy path.
The checker reports evidence, not automatic completion or a backup guarantee.

Each command block is one action. `bash` means the Linux terminal; `sql` means
inside psql. `psql` blocks contain psql commands such as `\q`. Do not type the
prompt itself. A query returning the expected result is evidence; a file merely
existing is not proof of recoverability. Expected results below are predictions,
not fabricated captures from your machine.

## Help and what to submit

- [Connection map](CLASS-SETUP.md) — which server, database and port to use.
- [Troubleshooting and resuming](TROUBLESHOOTING.md) — keep your existing work safe.
- [Check your progress](CHECKS.md) — a read-only command; no need to read its code.
- [Evidence sheet](EVIDENCE.md) — record what you did and how you proved it worked.

Submit evidence, not passwords or backup files. Your instructor confirms the
server setup before class. No database server runs on GitHub.

**Teaching this course?** Use the separate [instructor area](../../instructor/README.md).
